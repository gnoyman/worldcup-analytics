/**
 * OpenFootballProvider — FootballProvider backed by the public
 * openfootball/worldcup.json dataset on GitHub (no API key required).
 *
 * Source: https://github.com/openfootball/worldcup.json
 * Data:   World Cup 2026 group-stage fixtures, teams and groups.
 *
 * Limitations (clearly documented):
 *   • No live match data — getLiveMatches() returns []
 *   • No player stats / top scorers — getTopScorers() returns []
 *   • Scores only appear after matches are played (none yet, tournament
 *     starts June 2026). All fixtures return status "unplayed" until then.
 *
 * Caching: raw JSON is cached server-side for 24 hours (DEFAULT_TTL).
 */

import type { FootballProvider } from "./provider";
import type { Match, GroupStanding, Group, Team } from "@/types";
import type { PlayerStat } from "@/data/mockStats";
import { getCached, setCached, DEFAULT_TTL } from "./cache";
import { calculateAllGroupStandings } from "@/engine/standings/standings";

// ── Source ────────────────────────────────────────────────────────────────────

export const OF_SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const RAW_CACHE_KEY = "openfootball:wc2026";

/** Last time raw data was successfully fetched from GitHub (epoch ms). */
let _lastFetchAt: number | null = null;
export function getLastFetchAt(): number | null { return _lastFetchAt; }

// ── Raw data shapes ───────────────────────────────────────────────────────────

interface OFScore { ft: [number, number] }

interface OFMatch {
  round: string;
  num?: number;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: OFScore;
}

interface OFData {
  name: string;
  matches: OFMatch[];
}

// ── Team mapping: OpenFootball English name → internal Team ──────────────────
//
// All 48 WC 2026 qualified teams in their correct groups.
// Strength ratings are FIFA-ranking estimates (1-100 scale).

interface TeamMeta {
  id: string;
  name: string;   // Hebrew
  code: string;   // 3-letter
  flag: string;
  strengthRating: number;
}

const TEAM_MAP: Record<string, TeamMeta> = {
  // Group A
  "Mexico":             { id: "mex", name: "מקסיקו",           code: "MEX", flag: "🇲🇽", strengthRating: 81 },
  "South Africa":       { id: "rsa", name: "דרום אפריקה",      code: "RSA", flag: "🇿🇦", strengthRating: 67 },
  "South Korea":        { id: "kor", name: "קוריאה הדרומית",   code: "KOR", flag: "🇰🇷", strengthRating: 78 },
  "Czech Republic":     { id: "cze", name: "צ'כיה",            code: "CZE", flag: "🇨🇿", strengthRating: 75 },
  // Group B
  "Canada":             { id: "can", name: "קנדה",             code: "CAN", flag: "🇨🇦", strengthRating: 74 },
  "Bosnia & Herzegovina":{ id: "bih", name: "בוסניה",          code: "BIH", flag: "🇧🇦", strengthRating: 70 },
  "Qatar":              { id: "qat", name: "קטאר",             code: "QAT", flag: "🇶🇦", strengthRating: 67 },
  "Switzerland":        { id: "sui", name: "שוויץ",            code: "SUI", flag: "🇨🇭", strengthRating: 80 },
  // Group C
  "Brazil":             { id: "bra", name: "ברזיל",            code: "BRA", flag: "🇧🇷", strengthRating: 91 },
  "Morocco":            { id: "mar", name: "מרוקו",            code: "MAR", flag: "🇲🇦", strengthRating: 79 },
  "Haiti":              { id: "hai", name: "האיטי",            code: "HAI", flag: "🇭🇹", strengthRating: 62 },
  "Scotland":           { id: "sco", name: "סקוטלנד",          code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", strengthRating: 72 },
  // Group D
  "USA":                { id: "usa", name: "ארצות הברית",      code: "USA", flag: "🇺🇸", strengthRating: 81 },
  "Paraguay":           { id: "par", name: "פרגוואי",          code: "PAR", flag: "🇵🇾", strengthRating: 71 },
  "Australia":          { id: "aus", name: "אוסטרליה",         code: "AUS", flag: "🇦🇺", strengthRating: 73 },
  "Turkey":             { id: "tur", name: "טורקיה",           code: "TUR", flag: "🇹🇷", strengthRating: 78 },
  // Group E
  "Germany":            { id: "ger", name: "גרמניה",           code: "GER", flag: "🇩🇪", strengthRating: 87 },
  "Curaçao":            { id: "cuw", name: "קוראסאו",          code: "CUW", flag: "🇨🇼", strengthRating: 60 },
  "Ivory Coast":        { id: "civ", name: "חוף השנהב",        code: "CIV", flag: "🇨🇮", strengthRating: 77 },
  "Ecuador":            { id: "ecu", name: "אקוודור",          code: "ECU", flag: "🇪🇨", strengthRating: 74 },
  // Group F
  "Netherlands":        { id: "ned", name: "הולנד",            code: "NED", flag: "🇳🇱", strengthRating: 85 },
  "Japan":              { id: "jpn", name: "יפן",              code: "JPN", flag: "🇯🇵", strengthRating: 79 },
  "Sweden":             { id: "swe", name: "שוודיה",           code: "SWE", flag: "🇸🇪", strengthRating: 75 },
  "Tunisia":            { id: "tun", name: "תוניסיה",          code: "TUN", flag: "🇹🇳", strengthRating: 70 },
  // Group G
  "Belgium":            { id: "bel", name: "בלגיה",            code: "BEL", flag: "🇧🇪", strengthRating: 84 },
  "Egypt":              { id: "egy", name: "מצרים",            code: "EGY", flag: "🇪🇬", strengthRating: 73 },
  "Iran":               { id: "irn", name: "איראן",            code: "IRN", flag: "🇮🇷", strengthRating: 72 },
  "New Zealand":        { id: "nzl", name: "ניו זילנד",        code: "NZL", flag: "🇳🇿", strengthRating: 68 },
  // Group H
  "Spain":              { id: "esp", name: "ספרד",             code: "ESP", flag: "🇪🇸", strengthRating: 89 },
  "Cape Verde":         { id: "cpv", name: "כף ורדה",          code: "CPV", flag: "🇨🇻", strengthRating: 66 },
  "Saudi Arabia":       { id: "ksa", name: "ערב הסעודית",      code: "KSA", flag: "🇸🇦", strengthRating: 72 },
  "Uruguay":            { id: "uru", name: "אורוגוואי",        code: "URU", flag: "🇺🇾", strengthRating: 80 },
  // Group I
  "France":             { id: "fra", name: "צרפת",             code: "FRA", flag: "🇫🇷", strengthRating: 90 },
  "Senegal":            { id: "sen", name: "סנגל",             code: "SEN", flag: "🇸🇳", strengthRating: 77 },
  "Iraq":               { id: "irq", name: "עיראק",            code: "IRQ", flag: "🇮🇶", strengthRating: 67 },
  "Norway":             { id: "nor", name: "נורווגיה",         code: "NOR", flag: "🇳🇴", strengthRating: 76 },
  // Group J
  "Argentina":          { id: "arg", name: "ארגנטינה",         code: "ARG", flag: "🇦🇷", strengthRating: 92 },
  "Algeria":            { id: "alg", name: "אלג'יריה",         code: "ALG", flag: "🇩🇿", strengthRating: 74 },
  "Austria":            { id: "aut", name: "אוסטריה",          code: "AUT", flag: "🇦🇹", strengthRating: 76 },
  "Jordan":             { id: "jor", name: "ירדן",             code: "JOR", flag: "🇯🇴", strengthRating: 66 },
  // Group K
  "Portugal":           { id: "por", name: "פורטוגל",          code: "POR", flag: "🇵🇹", strengthRating: 85 },
  "DR Congo":           { id: "cod", name: "קונגו הדמוקרטית",  code: "COD", flag: "🇨🇩", strengthRating: 69 },
  "Uzbekistan":         { id: "uzb", name: "אוזבקיסטן",        code: "UZB", flag: "🇺🇿", strengthRating: 69 },
  "Colombia":           { id: "col", name: "קולומביה",         code: "COL", flag: "🇨🇴", strengthRating: 79 },
  // Group L
  "England":            { id: "eng", name: "אנגליה",           code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strengthRating: 86 },
  "Croatia":            { id: "cro", name: "קרואטיה",          code: "CRO", flag: "🇭🇷", strengthRating: 80 },
  "Ghana":              { id: "gha", name: "גאנה",             code: "GHA", flag: "🇬🇭", strengthRating: 71 },
  "Panama":             { id: "pan", name: "פנמה",             code: "PAN", flag: "🇵🇦", strengthRating: 63 },
};

function teamFromName(name: string): Team {
  const meta = TEAM_MAP[name];
  if (meta) {
    return { id: meta.id, name: meta.name, code: meta.code, flag: meta.flag, strengthRating: meta.strengthRating };
  }
  // Fallback for unmapped team names (defensive)
  const slug = name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6);
  return { id: `of_${slug}`, name, code: name.slice(0, 3).toUpperCase(), flag: "🏳", strengthRating: 65 };
}

function groupIdFromStr(s: string): string {
  // "Group A" → "A"
  return s.replace(/^Group\s+/i, "").trim();
}

// ── Match-day assignment ──────────────────────────────────────────────────────
//
// Each group has exactly 6 fixtures (round-robin of 4 teams, 3 matchdays × 2 games).
// Sort by date, then assign matchday 1 to the first 2, matchday 2 to the next 2,
// and matchday 3 to the last 2 — regardless of global "Matchday X" round labels.

function buildMatchDayMap(groupMatches: OFMatch[]): Map<string, number> {
  const sorted = [...groupMatches].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")
  );
  const result = new Map<string, number>();
  sorted.forEach((m, i) => {
    result.set(`${m.date}|${m.team1}|${m.team2}`, Math.floor(i / 2) + 1);
  });
  return result;
}

// ── Fetch / cache raw JSON ────────────────────────────────────────────────────

async function fetchRawData(): Promise<OFData> {
  const cached = getCached<OFData>(RAW_CACHE_KEY);
  if (cached) return cached;

  const res = await fetch(OF_SOURCE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`OpenFootball fetch failed: HTTP ${res.status}`);

  const data = (await res.json()) as OFData;
  setCached(RAW_CACHE_KEY, data, DEFAULT_TTL);
  _lastFetchAt = Date.now();
  return data;
}

// ── Derived data builders ─────────────────────────────────────────────────────

function buildGroupsAndFixtures(raw: OFData): { groups: Group[]; matches: Match[] } {
  const groupMatches = raw.matches.filter((m) => !!m.group);

  // Index group-stage matches per group for match-day assignment
  const byGroup = new Map<string, OFMatch[]>();
  for (const m of groupMatches) {
    const gid = groupIdFromStr(m.group!);
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid)!.push(m);
  }

  // Build Group objects (preserving canonical A-L order)
  const groupOrder = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const groups: Group[] = [];

  for (const gid of groupOrder) {
    const gMatches = byGroup.get(gid) ?? [];
    if (gMatches.length === 0) continue;

    const teamSet = new Map<string, Team>();
    for (const m of gMatches) {
      for (const name of [m.team1, m.team2]) {
        const t = teamFromName(name);
        if (!teamSet.has(t.id)) teamSet.set(t.id, t);
      }
    }

    groups.push({
      id: gid,
      name: `Group ${gid}`,
      teams: [...teamSet.values()],
    });
  }

  // Build Match objects
  const matches: Match[] = [];
  for (const [gid, gMatches] of byGroup) {
    const matchDayMap = buildMatchDayMap(gMatches);
    for (const m of gMatches) {
      const homeTeam = teamFromName(m.team1);
      const awayTeam = teamFromName(m.team2);
      const key = `${m.date}|${m.team1}|${m.team2}`;
      const matchDay = matchDayMap.get(key) ?? 1;
      const status: Match["status"] = m.score ? "played" : "unplayed";

      matches.push({
        id: `of_${gid}_${homeTeam.id}_${awayTeam.id}_md${matchDay}`,
        groupId: gid,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: m.score ? m.score.ft[0] : undefined,
        awayScore: m.score ? m.score.ft[1] : undefined,
        status,
        matchDay,
        date: m.date,
        time: m.time,
      });
    }
  }

  return { groups, matches };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class OpenFootballProvider implements FootballProvider {

  async getFixtures(): Promise<Match[]> {
    const raw = await fetchRawData();
    return buildGroupsAndFixtures(raw).matches;
  }

  /** Not available from OpenFootball — returns empty array. */
  async getLiveMatches(): Promise<Match[]> {
    return [];
  }

  async getStandings(): Promise<GroupStanding[]> {
    const raw = await fetchRawData();
    const { groups, matches } = buildGroupsAndFixtures(raw);
    return calculateAllGroupStandings(groups, matches);
  }

  async getMatchDetails(matchId: string): Promise<Match | null> {
    const matches = await this.getFixtures();
    return matches.find((m) => m.id === matchId) ?? null;
  }

  /** Not available from OpenFootball — returns empty array. */
  async getTopScorers(): Promise<PlayerStat[]> {
    return [];
  }

  /** Returns the real WC 2026 Group[] derived from the fixture data. */
  async getGroups(): Promise<Group[] | null> {
    const raw = await fetchRawData();
    return buildGroupsAndFixtures(raw).groups;
  }
}
