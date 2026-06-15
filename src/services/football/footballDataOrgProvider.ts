/**
 * FootballDataOrgProvider — FootballProvider backed by football-data.org v4 API.
 *
 * Docs:  https://docs.football-data.org/general/v4/
 * Auth:  X-Auth-Token header (key from FOOTBALL_DATA_ORG_KEY env var)
 * Limit: 10 requests/minute on the free tier — no daily cap.
 *
 * Endpoints used:
 *   GET /v4/competitions/WC/matches   — all 104 fixtures (group + knockout)
 *   GET /v4/competitions/WC/standings — live group standings, all 12 groups
 *   GET /v4/competitions/WC/scorers   — tournament top scorers
 *
 * Team IDs: derived from the TLA field via tla.toLowerCase().
 *   "GER" → "ger", "MEX" → "mex", "KSA" → "ksa", etc.
 *   All 48 WC 2026 teams are covered in TLA_MAP.
 *
 * Group normalisation:
 *   Matches use "GROUP_A"; standings use "Group A".
 *   Both are normalised to just "A" via normalizeGroup().
 *
 * Knockout matches:
 *   getFixtures() returns all 104 matches (group + knockout stages).
 *   Knockout matches get groupId="KO" and use "tbd" as placeholder IDs when
 *   teams are not yet determined — the bracket engine resolves them from standings.
 *
 * Caching:
 *   All three endpoints share the DEFAULT_TTL (set by API_CACHE_TTL_HOURS).
 *   Set API_CACHE_TTL_HOURS=1 for a 60-minute refresh cycle.
 */

import type { FootballProvider } from "./provider";
import type { Match, GroupStanding, Group, Team } from "@/types";
import type { PlayerStat } from "@/data/mockStats";
import { getCached, setCached, DEFAULT_TTL } from "./cache";

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL    = "https://api.football-data.org/v4";
const COMPETITION = "WC";

// ── Cache keys ────────────────────────────────────────────────────────────────

export const FDO_CACHE_MATCHES   = "fdo:matches";
export const FDO_CACHE_STANDINGS = "fdo:standings";
export const FDO_CACHE_SCORERS   = "fdo:scorers";

// ── TLA → Team metadata (Hebrew names + flags) ─────────────────────────────

interface TeamMeta { name: string; flag: string; strengthRating: number }

const TLA_MAP: Record<string, TeamMeta> = {
  // Group A
  MEX: { name: "מקסיקו",          flag: "🇲🇽", strengthRating: 81 },
  RSA: { name: "דרום אפריקה",     flag: "🇿🇦", strengthRating: 67 },
  KOR: { name: "קוריאה הדרומית",  flag: "🇰🇷", strengthRating: 78 },
  CZE: { name: "צ'כיה",           flag: "🇨🇿", strengthRating: 75 },
  // Group B
  CAN: { name: "קנדה",            flag: "🇨🇦", strengthRating: 74 },
  BIH: { name: "בוסניה",          flag: "🇧🇦", strengthRating: 70 },
  QAT: { name: "קטאר",            flag: "🇶🇦", strengthRating: 67 },
  SUI: { name: "שוויץ",           flag: "🇨🇭", strengthRating: 80 },
  // Group C
  BRA: { name: "ברזיל",           flag: "🇧🇷", strengthRating: 91 },
  MAR: { name: "מרוקו",           flag: "🇲🇦", strengthRating: 79 },
  HAI: { name: "האיטי",           flag: "🇭🇹", strengthRating: 62 },
  SCO: { name: "סקוטלנד",         flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", strengthRating: 72 },
  // Group D
  USA: { name: "ארצות הברית",     flag: "🇺🇸", strengthRating: 81 },
  PAR: { name: "פרגוואי",         flag: "🇵🇾", strengthRating: 71 },
  AUS: { name: "אוסטרליה",        flag: "🇦🇺", strengthRating: 73 },
  TUR: { name: "טורקיה",          flag: "🇹🇷", strengthRating: 78 },
  // Group E
  GER: { name: "גרמניה",          flag: "🇩🇪", strengthRating: 87 },
  CUW: { name: "קוראסאו",         flag: "🇨🇼", strengthRating: 60 },
  CIV: { name: "חוף השנהב",       flag: "🇨🇮", strengthRating: 77 },
  ECU: { name: "אקוודור",         flag: "🇪🇨", strengthRating: 74 },
  // Group F
  NED: { name: "הולנד",           flag: "🇳🇱", strengthRating: 85 },
  JPN: { name: "יפן",             flag: "🇯🇵", strengthRating: 79 },
  SWE: { name: "שוודיה",          flag: "🇸🇪", strengthRating: 75 },
  TUN: { name: "תוניסיה",         flag: "🇹🇳", strengthRating: 70 },
  // Group G
  BEL: { name: "בלגיה",           flag: "🇧🇪", strengthRating: 84 },
  EGY: { name: "מצרים",           flag: "🇪🇬", strengthRating: 73 },
  IRN: { name: "איראן",           flag: "🇮🇷", strengthRating: 72 },
  NZL: { name: "ניו זילנד",       flag: "🇳🇿", strengthRating: 68 },
  // Group H
  ESP: { name: "ספרד",            flag: "🇪🇸", strengthRating: 89 },
  CPV: { name: "כף ורדה",         flag: "🇨🇻", strengthRating: 66 },
  KSA: { name: "ערב הסעודית",     flag: "🇸🇦", strengthRating: 72 },
  URY: { name: "אורוגוואי",       flag: "🇺🇾", strengthRating: 80 },
  // Group I
  FRA: { name: "צרפת",            flag: "🇫🇷", strengthRating: 90 },
  SEN: { name: "סנגל",            flag: "🇸🇳", strengthRating: 77 },
  IRQ: { name: "עיראק",           flag: "🇮🇶", strengthRating: 67 },
  NOR: { name: "נורווגיה",        flag: "🇳🇴", strengthRating: 76 },
  // Group J
  ARG: { name: "ארגנטינה",        flag: "🇦🇷", strengthRating: 92 },
  ALG: { name: "אלג'יריה",        flag: "🇩🇿", strengthRating: 74 },
  AUT: { name: "אוסטריה",         flag: "🇦🇹", strengthRating: 76 },
  JOR: { name: "ירדן",            flag: "🇯🇴", strengthRating: 66 },
  // Group K
  POR: { name: "פורטוגל",         flag: "🇵🇹", strengthRating: 85 },
  COD: { name: "קונגו הדמוקרטית", flag: "🇨🇩", strengthRating: 69 },
  UZB: { name: "אוזבקיסטן",       flag: "🇺🇿", strengthRating: 69 },
  COL: { name: "קולומביה",        flag: "🇨🇴", strengthRating: 79 },
  // Group L
  ENG: { name: "אנגליה",          flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strengthRating: 86 },
  CRO: { name: "קרואטיה",         flag: "🇭🇷", strengthRating: 80 },
  GHA: { name: "גאנה",            flag: "🇬🇭", strengthRating: 71 },
  PAN: { name: "פנמה",            flag: "🇵🇦", strengthRating: 63 },
};

function teamFromTla(tla: string): Team {
  const upper = tla.toUpperCase();
  const id    = tla.toLowerCase();
  const meta  = TLA_MAP[upper];
  if (meta) return { id, name: meta.name, code: upper, flag: meta.flag, strengthRating: meta.strengthRating };
  return { id, name: tla, code: upper, flag: "🏳", strengthRating: 65 };
}

// ── Group name normalisation ──────────────────────────────────────────────────

/** "GROUP_A" → "A",  "Group A" → "A",  null → null */
function normalizeGroup(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
}

// ── UTC → Israel time (UTC+3, WC runs entirely in summer IDT) ────────────────

function utcToIsrael(iso: string): string {
  const d = new Date(iso);
  const h = (d.getUTCHours() + 3) % 24;
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── API response shapes ───────────────────────────────────────────────────────

type FDOStatus =
  | "SCHEDULED" | "TIMED"
  | "IN_PLAY" | "PAUSED" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
  | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";

interface FDOTeamRef {
  id:        number | null;
  name:      string | null;
  shortName: string | null;
  tla:       string | null;
  crest:     string | null;
}

interface FDOMatch {
  id:       number;
  utcDate:  string;
  status:   FDOStatus;
  matchday: number | null;
  stage:    string;
  group:    string | null;
  homeTeam: FDOTeamRef;
  awayTeam: FDOTeamRef;
  score: {
    winner:   string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

interface FDOMatchesResponse {
  resultSet: { count: number; played: number };
  matches:   FDOMatch[];
}

interface FDOStandingRow {
  position:       number;
  team:           { id: number; name: string; shortName: string; tla: string };
  playedGames:    number;
  won:            number;
  draw:           number;
  lost:           number;
  points:         number;
  goalsFor:       number;
  goalsAgainst:   number;
  goalDifference: number;
}

interface FDOStandingGroup {
  stage: string;
  type:  string;
  group: string;
  table: FDOStandingRow[];
}

interface FDOStandingsResponse {
  standings: FDOStandingGroup[];
}

interface FDOScorer {
  player: { id: number; name: string };
  team:   { id: number; name: string; shortName: string; tla: string };
  playedMatches: number;
  goals:    number;
  assists:  number | null;
  penalties: number | null;
}

interface FDOScorersResponse {
  count:   number;
  scorers: FDOScorer[];
}

// ── Status helpers ────────────────────────────────────────────────────────────

const PLAYED_STATUSES = new Set<FDOStatus>(["FINISHED", "AWARDED"]);

// ── Provider ──────────────────────────────────────────────────────────────────

export class FootballDataOrgProvider implements FootballProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  private async fdoFetch<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: { "X-Auth-Token": this.apiKey },
      cache: "no-store",
    });

    if (res.status === 429) {
      throw new Error(`[fdo] Rate limited (HTTP 429) on ${path}`);
    }
    if (!res.ok) {
      throw new Error(`[fdo] HTTP ${res.status}: ${res.statusText} — ${path}`);
    }
    return res.json() as Promise<T>;
  }

  // Shared raw matches fetch with cache
  private async fetchRawMatches(): Promise<FDOMatch[]> {
    const cached = getCached<FDOMatch[]>(FDO_CACHE_MATCHES);
    if (cached) return cached;

    const data = await this.fdoFetch<FDOMatchesResponse>(
      `/competitions/${COMPETITION}/matches`
    );
    setCached(FDO_CACHE_MATCHES, data.matches, DEFAULT_TTL);
    return data.matches;
  }

  async getFixtures(): Promise<Match[]> {
    const allMatches = await this.fetchRawMatches();

    return allMatches.map((m): Match => {
      const isGroup  = m.stage === "GROUP_STAGE";
      const isPlayed = PLAYED_STATUSES.has(m.status);

      const groupId  = isGroup ? (normalizeGroup(m.group) ?? "A") : "KO";
      const matchDay = isGroup ? (m.matchday ?? 1) : 0;
      const homeId   = m.homeTeam.tla ? m.homeTeam.tla.toLowerCase() : "tbd";
      const awayId   = m.awayTeam.tla ? m.awayTeam.tla.toLowerCase() : "tbd";

      return {
        id:         String(m.id),
        groupId,
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeScore:  isPlayed ? (m.score.fullTime.home ?? undefined) : undefined,
        awayScore:  isPlayed ? (m.score.fullTime.away ?? undefined) : undefined,
        status:     isPlayed ? "played" : "unplayed",
        matchDay,
        date:       m.utcDate.slice(0, 10),
        time:       utcToIsrael(m.utcDate),
      };
    });
  }

  async getLiveMatches(): Promise<Match[]> {
    return [];
  }

  async getStandings(): Promise<GroupStanding[]> {
    const cached = getCached<GroupStanding[]>(FDO_CACHE_STANDINGS);
    if (cached) return cached;

    const data = await this.fdoFetch<FDOStandingsResponse>(
      `/competitions/${COMPETITION}/standings`
    );

    const result: GroupStanding[] = [];

    for (const group of data.standings) {
      const groupId = normalizeGroup(group.group);
      if (!groupId) continue;

      for (const row of group.table) {
        const team = teamFromTla(row.team.tla);
        result.push({
          teamId:         team.id,
          team,
          groupId,
          played:         row.playedGames,
          wins:           row.won,
          draws:          row.draw,
          losses:         row.lost,
          goalsFor:       row.goalsFor,
          goalsAgainst:   row.goalsAgainst,
          goalDifference: row.goalDifference,
          points:         row.points,
          position:       row.position,
        });
      }
    }

    setCached(FDO_CACHE_STANDINGS, result, DEFAULT_TTL);
    return result;
  }

  async getMatchDetails(matchId: string): Promise<Match | null> {
    const fixtures = await this.getFixtures();
    return fixtures.find((f) => f.id === matchId) ?? null;
  }

  async getTopScorers(): Promise<PlayerStat[]> {
    const cached = getCached<PlayerStat[]>(FDO_CACHE_SCORERS);
    if (cached) return cached;

    try {
      const data = await this.fdoFetch<FDOScorersResponse>(
        `/competitions/${COMPETITION}/scorers?limit=50`
      );

      const result: PlayerStat[] = data.scorers.map((s): PlayerStat => {
        const tlaUpper = s.team.tla.toUpperCase();
        const meta = TLA_MAP[tlaUpper];
        return {
          id:            String(s.player.id),
          name:          s.player.name,
          teamId:        tlaUpper.toLowerCase(),
          teamCode:      tlaUpper,
          teamFlag:      meta?.flag    ?? "🏳",
          teamName:      meta?.name    ?? s.team.name,
          position:      "FWD",
          goals:         s.goals,
          assists:       s.assists    ?? 0,
          matchesPlayed: s.playedMatches,
          shotsOnTarget: 0,
          saves:         0,
          yellowCards:   0,
          redCards:      0,
        };
      });

      setCached(FDO_CACHE_SCORERS, result, DEFAULT_TTL);
      return result;
    } catch (err) {
      console.warn("[fdo] getTopScorers failed — returning empty:", err);
      return [];
    }
  }

  async getGroups(): Promise<Group[] | null> {
    return null;
  }
}
