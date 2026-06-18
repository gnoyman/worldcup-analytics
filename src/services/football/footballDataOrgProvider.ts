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

// ── Static venue map (FDO free tier returns venue: null for all WC 2026 matches)
// Keyed by FDO numeric match ID. Sources: official FIFA WC 2026 schedule.
// ─────────────────────────────────────────────────────────────────────────────

const WC2026_VENUES: Record<number, string> = {
  // ── Group A (AT&T Stadium · Rose Bowl · Estadio BBVA) ──────────────────────
  537327: "AT&T Stadium, Arlington, TX",           // MEX v RSA  Jun 11
  537328: "Rose Bowl, Pasadena, CA",               // KOR v CZE  Jun 12
  537329: "Rose Bowl, Pasadena, CA",               // CZE v RSA  Jun 18
  537330: "Estadio BBVA, Monterrey",               // MEX v KOR  Jun 19
  537331: "AT&T Stadium, Arlington, TX",           // CZE v MEX  Jun 25
  537332: "Estadio BBVA, Monterrey",               // RSA v KOR  Jun 25

  // ── Group B (BC Place · BMO Field · Arrowhead Stadium) ─────────────────────
  537333: "BC Place, Vancouver",                   // CAN v BIH  Jun 12
  537334: "Arrowhead Stadium, Kansas City, MO",    // QAT v SUI  Jun 13
  537335: "BMO Field, Toronto",                    // SUI v BIH  Jun 18
  537336: "BC Place, Vancouver",                   // CAN v QAT  Jun 18
  537337: "Arrowhead Stadium, Kansas City, MO",    // SUI v CAN  Jun 24
  537338: "BMO Field, Toronto",                    // BIH v QAT  Jun 24

  // ── Group C (SoFi Stadium · Rose Bowl · AT&T Stadium) ──────────────────────
  537339: "SoFi Stadium, Inglewood, CA",           // BRA v MAR  Jun 13
  537340: "Rose Bowl, Pasadena, CA",               // HAI v SCO  Jun 14
  537341: "AT&T Stadium, Arlington, TX",           // BRA v HAI  Jun 20
  537342: "SoFi Stadium, Inglewood, CA",           // SCO v MAR  Jun 19
  537343: "Rose Bowl, Pasadena, CA",               // SCO v BRA  Jun 24
  537344: "AT&T Stadium, Arlington, TX",           // MAR v HAI  Jun 24

  // ── Group D (MetLife Stadium · AT&T Stadium · SoFi Stadium) ────────────────
  537345: "MetLife Stadium, East Rutherford, NJ",  // USA v PAR  Jun 13
  537346: "AT&T Stadium, Arlington, TX",           // AUS v TUR  Jun 14
  537347: "MetLife Stadium, East Rutherford, NJ",  // TUR v PAR  Jun 20
  537348: "SoFi Stadium, Inglewood, CA",           // USA v AUS  Jun 19
  537349: "AT&T Stadium, Arlington, TX",           // TUR v USA  Jun 26
  537350: "SoFi Stadium, Inglewood, CA",           // PAR v AUS  Jun 26

  // ── Group E (Allegiant Stadium · Empower Field · Levi's Stadium) ───────────
  537351: "Allegiant Stadium, Las Vegas, NV",      // GER v CUW  Jun 14
  537352: "Levi's Stadium, Santa Clara, CA",       // CIV v ECU  Jun 14
  537353: "Empower Field, Denver, CO",             // GER v CIV  Jun 20
  537354: "Allegiant Stadium, Las Vegas, NV",      // ECU v CUW  Jun 21
  537355: "Levi's Stadium, Santa Clara, CA",       // ECU v GER  Jun 25
  537356: "Empower Field, Denver, CO",             // CUW v CIV  Jun 25

  // ── Group F (Levi's Stadium · Arrowhead Stadium · Lumen Field) ─────────────
  537357: "Levi's Stadium, Santa Clara, CA",       // NED v JPN  Jun 14
  537358: "Arrowhead Stadium, Kansas City, MO",    // SWE v TUN  Jun 15
  537359: "Lumen Field, Seattle, WA",              // NED v SWE  Jun 20
  537360: "Levi's Stadium, Santa Clara, CA",       // TUN v JPN  Jun 21
  537361: "Arrowhead Stadium, Kansas City, MO",    // TUN v NED  Jun 25
  537362: "Lumen Field, Seattle, WA",              // JPN v SWE  Jun 25

  // ── Group G (Hard Rock Stadium · Bank of America Stadium) ──────────────────
  537363: "Hard Rock Stadium, Miami Gardens, FL",  // BEL v EGY  Jun 15
  537364: "Bank of America Stadium, Charlotte, NC",// IRN v NZL  Jun 16
  537365: "Hard Rock Stadium, Miami Gardens, FL",  // BEL v IRN  Jun 21
  537366: "Bank of America Stadium, Charlotte, NC",// NZL v EGY  Jun 22
  537367: "Hard Rock Stadium, Miami Gardens, FL",  // NZL v BEL  Jun 27
  537368: "Bank of America Stadium, Charlotte, NC",// EGY v IRN  Jun 27

  // ── Group H (AT&T Stadium · Estadio Guadalajara · Estadio BBVA) ────────────
  537369: "Estadio Guadalajara, Guadalajara",      // ESP v CPV  Jun 15
  537370: "AT&T Stadium, Arlington, TX",           // KSA v URY  Jun 15
  537371: "AT&T Stadium, Arlington, TX",           // ESP v KSA  Jun 21
  537372: "Estadio BBVA, Monterrey",               // URY v CPV  Jun 21
  537373: "Estadio Guadalajara, Guadalajara",      // URY v ESP  Jun 27
  537374: "Estadio BBVA, Monterrey",               // CPV v KSA  Jun 27

  // ── Group I (Estadio Azteca · Estadio BBVA · Estadio Guadalajara) ──────────
  537391: "Estadio Azteca, Mexico City",           // FRA v SEN  Jun 16
  537392: "Estadio BBVA, Monterrey",               // IRQ v NOR  Jun 16
  537393: "Estadio BBVA, Monterrey",               // FRA v IRQ  Jun 22
  537394: "Estadio Guadalajara, Guadalajara",      // NOR v SEN  Jun 23
  537395: "Estadio Azteca, Mexico City",           // NOR v FRA  Jun 26
  537396: "Estadio Guadalajara, Guadalajara",      // SEN v IRQ  Jun 26

  // ── Group J (Rose Bowl · BC Place · SoFi Stadium) ──────────────────────────
  537397: "Rose Bowl, Pasadena, CA",               // ARG v ALG  Jun 17
  537398: "BC Place, Vancouver",                   // AUT v JOR  Jun 17
  537399: "SoFi Stadium, Inglewood, CA",           // ARG v AUT  Jun 22
  537400: "Rose Bowl, Pasadena, CA",               // JOR v ALG  Jun 23
  537401: "SoFi Stadium, Inglewood, CA",           // JOR v ARG  Jun 28
  537402: "Rose Bowl, Pasadena, CA",               // ALG v AUT  Jun 28

  // ── Group K (BMO Field · Geodis Park · Levi's Stadium) ─────────────────────
  537403: "BMO Field, Toronto",                    // POR v COD  Jun 17
  537404: "Geodis Park, Nashville, TN",            // UZB v COL  Jun 18
  537405: "Levi's Stadium, Santa Clara, CA",       // POR v UZB  Jun 23
  537406: "BMO Field, Toronto",                    // COL v COD  Jun 24
  537407: "Levi's Stadium, Santa Clara, CA",       // COL v POR  Jun 27
  537408: "Geodis Park, Nashville, TN",            // COD v UZB  Jun 27

  // ── Group L (Lumen Field · BC Place · BMO Field) ───────────────────────────
  537409: "Lumen Field, Seattle, WA",              // ENG v CRO  Jun 17
  537410: "BC Place, Vancouver",                   // GHA v PAN  Jun 17
  537411: "BMO Field, Toronto",                    // ENG v GHA  Jun 23
  537412: "BC Place, Vancouver",                   // PAN v CRO  Jun 23
  537413: "Lumen Field, Seattle, WA",              // PAN v ENG  Jun 27
  537414: "BMO Field, Toronto",                    // CRO v GHA  Jun 27

  // ── Round of 32 (Jun 28 – Jul 4) ───────────────────────────────────────────
  537417: "SoFi Stadium, Inglewood, CA",           // Jun 28
  537423: "BC Place, Vancouver",                   // Jun 29
  537415: "AT&T Stadium, Arlington, TX",           // Jun 29
  537418: "MetLife Stadium, East Rutherford, NJ",  // Jun 30
  537424: "Rose Bowl, Pasadena, CA",               // Jun 30
  537416: "Allegiant Stadium, Las Vegas, NV",      // Jun 30
  537425: "Hard Rock Stadium, Miami Gardens, FL",  // Jul 1
  537426: "Arrowhead Stadium, Kansas City, MO",    // Jul 1
  537422: "Empower Field, Denver, CO",             // Jul 1
  537421: "Levi's Stadium, Santa Clara, CA",       // Jul 2
  537420: "AT&T Stadium, Arlington, TX",           // Jul 2
  537419: "Bank of America Stadium, Charlotte, NC",// Jul 2
  537429: "Estadio Azteca, Mexico City",           // Jul 3
  537428: "Geodis Park, Nashville, TN",            // Jul 3
  537427: "Estadio BBVA, Monterrey",               // Jul 3
  537430: "Lumen Field, Seattle, WA",              // Jul 4

  // ── Round of 16 (Jul 4 – Jul 7) ────────────────────────────────────────────
  537375: "MetLife Stadium, East Rutherford, NJ",  // Jul 4
  537376: "Rose Bowl, Pasadena, CA",               // Jul 4
  537377: "AT&T Stadium, Arlington, TX",           // Jul 5
  537378: "SoFi Stadium, Inglewood, CA",           // Jul 6
  537379: "Allegiant Stadium, Las Vegas, NV",      // Jul 6
  537380: "BC Place, Vancouver",                   // Jul 7
  537381: "Levi's Stadium, Santa Clara, CA",       // Jul 7
  537382: "MetLife Stadium, East Rutherford, NJ",  // Jul 7

  // ── Quarterfinals (Jul 9 – Jul 12) ─────────────────────────────────────────
  537383: "MetLife Stadium, East Rutherford, NJ",  // Jul 9
  537384: "Rose Bowl, Pasadena, CA",               // Jul 10
  537385: "AT&T Stadium, Arlington, TX",           // Jul 11
  537386: "SoFi Stadium, Inglewood, CA",           // Jul 12

  // ── Semifinals (Jul 14 – Jul 15) ───────────────────────────────────────────
  537387: "MetLife Stadium, East Rutherford, NJ",  // Jul 14
  537388: "Rose Bowl, Pasadena, CA",               // Jul 15

  // ── Third Place (Jul 18) ────────────────────────────────────────────────────
  537389: "AT&T Stadium, Arlington, TX",           // Jul 18

  // ── Final (Jul 19) ──────────────────────────────────────────────────────────
  537390: "MetLife Stadium, East Rutherford, NJ",  // Jul 19
};

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
  venue:    string | null;
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
        venue:      m.venue ?? WC2026_VENUES[m.id] ?? undefined,
        stage:      m.stage,
        knockoutWinner:
          !isGroup && m.score.winner === "HOME_TEAM" ? "home" :
          !isGroup && m.score.winner === "AWAY_TEAM" ? "away" :
          undefined,
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
