/**
 * ApiFootballProvider — FootballProvider backed by API-Football v3.
 *
 * Docs: https://www.api-football.com/documentation-v3
 *
 * Used when USE_MOCK_DATA=false and API_FOOTBALL_KEY is set.
 * All HTTP calls are server-side only; the key is never sent to the browser.
 *
 * Free-plan fallback:
 *   Set API_FOOTBALL_DEV_MODE=true to use API_FOOTBALL_SEASON (default 2024)
 *   instead of 2026. Plan-restriction responses are surfaced as PlanRestrictionError
 *   rather than generic errors so callers can handle them gracefully.
 *
 * NOTE: Team IDs from API-Football are numeric and differ from the project's
 * internal string IDs (e.g. "ger", "fra"). Until a full ID-mapping table is
 * built, live team IDs are prefixed with "apif_". Hook up the lookup table
 * in `teamIdFromApiId` once the WC 2026 team roster is confirmed on the API.
 */

import type { FootballProvider } from "./provider";
import type { Match, GroupStanding, Team } from "@/types";
import type { PlayerStat } from "@/data/mockStats";

// ── Dev-mode / free-plan configuration ────────────────────────────────────────

/** True when API_FOOTBALL_DEV_MODE=true (free-plan / development fallback). */
export const IS_DEV_MODE = process.env.API_FOOTBALL_DEV_MODE === "true";

/**
 * Season passed to all season-scoped API endpoints.
 * Reads API_FOOTBALL_SEASON from env; defaults to 2024 in dev mode, 2026 otherwise.
 */
export const EFFECTIVE_SEASON: number = (() => {
  const envVal = process.env.API_FOOTBALL_SEASON;
  const defaultSeason = IS_DEV_MODE ? 2024 : 2026;
  const parsed = parseInt(envVal || String(defaultSeason), 10);
  return isNaN(parsed) ? defaultSeason : parsed;
})();

/**
 * League ID passed to all API endpoints.
 * Reads API_FOOTBALL_LEAGUE_ID from env; defaults to 1 (FIFA World Cup).
 */
export const EFFECTIVE_LEAGUE_ID: number = (() => {
  const envVal = process.env.API_FOOTBALL_LEAGUE_ID;
  const parsed = parseInt(envVal || "1", 10);
  return isNaN(parsed) ? 1 : parsed;
})();

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = "https://v3.football.api-sports.io";

// ── Rate limit state (module-level, persists across requests in the same process) ─

export class RateLimitError extends Error {
  constructor() {
    super("Daily API limit reached (HTTP 429). Using mock data until tomorrow.");
    this.name = "RateLimitError";
  }
}

let _rateLimitHit = false;
let _rateLimitAt: number | null = null;

export function markRateLimited(): void {
  _rateLimitHit = true;
  _rateLimitAt = Date.now();
}

export function isRateLimited(): boolean {
  return _rateLimitHit;
}

export function getRateLimitInfo(): { hit: boolean; at: number | null } {
  return { hit: _rateLimitHit, at: _rateLimitAt };
}

// ── Sync state (module-level, persists across requests in the same process) ───

function nextMidnight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

let _lastSyncAt:    number | null = null;
let _requestsToday: number        = 0;
let _dailyResetAt:  number        = nextMidnight();
let _lastApiError:  string | null = null;

function checkDailyReset(): void {
  if (Date.now() >= _dailyResetAt) {
    _requestsToday = 0;
    _dailyResetAt  = nextMidnight();
  }
}

export function recordApiRequest(): void {
  checkDailyReset();
  _requestsToday++;
}

export function recordSyncCompleted(): void {
  _lastSyncAt = Date.now();
}

export function recordApiError(msg: string): void {
  _lastApiError = msg;
}

export function getSyncState() {
  checkDailyReset();
  return {
    lastSyncAt:    _lastSyncAt,
    requestsToday: _requestsToday,
    dailyResetAt:  _dailyResetAt,
    lastApiError:  _lastApiError,
  };
}

// ── Plan restriction error ────────────────────────────────────────────────────

/**
 * Thrown when the API returns a plan-restriction response such as:
 *   "Free plans do not have access to this season, try from 2022 to 2024."
 *
 * Callers (route handlers) catch this specifically to return graceful empty
 * responses instead of 500 errors, keeping the UI and tournament state intact.
 */
export class PlanRestrictionError extends Error {
  readonly apiErrors: Record<string, string>;

  constructor(apiErrors: Record<string, string>) {
    super(
      `API-Football plan restriction: ${JSON.stringify(apiErrors)}` +
        ` (requested season=${EFFECTIVE_SEASON}, league=${EFFECTIVE_LEAGUE_ID})`
    );
    this.name = "PlanRestrictionError";
    this.apiErrors = apiErrors;
  }
}

function detectPlanRestriction(errors: Record<string, string> | string[]): boolean {
  const vals = Array.isArray(errors) ? errors : Object.values(errors);
  return vals.some((v) =>
    /free plan|access.*season|season.*try from/i.test(String(v))
  );
}

// ── API-Football response shapes ──────────────────────────────────────────────

interface ApiFixtureStatus {
  long: string;
  short: string; // "NS" | "1H" | "HT" | "2H" | "ET" | "PEN" | "FT" | "AET" | "PST" | "CANC" | "ABD" | "AWD" | "WO"
  elapsed: number | null;
}

interface ApiTeamRef {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

interface ApiFixture {
  fixture: { id: number; date: string; status: ApiFixtureStatus };
  league: { id: number; round: string; group?: string };
  teams: { home: ApiTeamRef; away: ApiTeamRef };
  goals: { home: number | null; away: number | null };
}

interface ApiStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

interface ApiPlayerStats {
  player: { id: number; name: string; photo: string };
  statistics: Array<{
    team: { id: number; name: string };
    games: { appearences: number; position: string };
    goals: { total: number | null; assists: number | null };
    shots: { on: number | null };
    cards: { yellow: number; red: number };
    goals_saves?: { saved: number | null };
  }>;
}

interface ApiResponse<T> {
  errors: Record<string, string> | string[];
  results: number;
  response: T;
}

// ── ID mapping ────────────────────────────────────────────────────────────────

/**
 * Maps an API-Football numeric team ID to the project's internal string ID.
 *
 * Extend this map once the full WC 2026 team list is available:
 *   https://www.api-football.com/documentation-v3#tag/Teams/operation/get-teams
 */
const API_ID_TO_INTERNAL: Record<number, string> = {
  // Examples — verify against the actual WC 2026 fixture data
  // 10: "ger",  // Germany
  // 2:  "fra",  // France
  // 6:  "bra",  // Brazil
};

/** Number of entries currently in the ID-mapping table. 0 = not yet populated. */
export const API_ID_MAPPING_SIZE = Object.keys(API_ID_TO_INTERNAL).length;

function teamIdFromApiId(apiId: number): string {
  return API_ID_TO_INTERNAL[apiId] ?? `apif_${apiId}`;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapFixtureToMatch(f: ApiFixture): Match {
  const terminalStatuses = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  const status: Match["status"] = terminalStatuses.has(f.fixture.status.short)
    ? "played"
    : "unplayed";

  // e.g. "Group Stage - 1" → matchDay 1
  const matchDayMatch = f.league.round.match(/(\d+)$/);
  const matchDay = matchDayMatch ? parseInt(matchDayMatch[1], 10) : 1;

  // "Group A" → "A"
  const groupId = f.league.group
    ? f.league.group.replace(/^Group\s+/i, "").trim()
    : "A";

  return {
    id: String(f.fixture.id),
    groupId,
    homeTeamId: teamIdFromApiId(f.teams.home.id),
    awayTeamId: teamIdFromApiId(f.teams.away.id),
    homeScore: status === "played" ? (f.goals.home ?? undefined) : undefined,
    awayScore: status === "played" ? (f.goals.away ?? undefined) : undefined,
    status,
    matchDay,
    date: f.fixture.date,
  };
}

function mapStandingEntry(
  entry: ApiStandingEntry,
  groupId: string
): GroupStanding {
  const team: Team = {
    id: teamIdFromApiId(entry.team.id),
    name: entry.team.name,
    code: entry.team.name.substring(0, 3).toUpperCase(),
    flag: "🏳", // not provided by standings endpoint; hydrate separately if needed
    strengthRating: 70, // unknown without additional source
  };

  return {
    teamId: team.id,
    team,
    groupId,
    played: entry.all.played,
    wins: entry.all.win,
    draws: entry.all.draw,
    losses: entry.all.lose,
    goalsFor: entry.all.goals.for,
    goalsAgainst: entry.all.goals.against,
    goalDifference: entry.goalsDiff,
    points: entry.points,
    position: entry.rank,
  };
}

const POSITION_MAP: Record<string, PlayerStat["position"]> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Attacker: "FWD",
};

function mapPlayerStats(p: ApiPlayerStats): PlayerStat | null {
  const stat = p.statistics[0];
  if (!stat) return null;

  return {
    id: String(p.player.id),
    name: p.player.name,
    teamId: teamIdFromApiId(stat.team.id),
    teamCode: stat.team.name.substring(0, 3).toUpperCase(),
    teamFlag: "🏳",
    teamName: stat.team.name,
    position: POSITION_MAP[stat.games.position] ?? "MID",
    goals: stat.goals.total ?? 0,
    assists: stat.goals.assists ?? 0,
    matchesPlayed: stat.games.appearences ?? 0,
    shotsOnTarget: stat.shots.on ?? 0,
    saves: stat.goals_saves?.saved ?? 0,
    yellowCards: stat.cards.yellow,
    redCards: stat.cards.red,
  };
}

// ── Provider class ────────────────────────────────────────────────────────────

export class ApiFootballProvider implements FootballProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    // Trim to guard against accidental whitespace in .env.local.
    this.apiKey = apiKey.trim();
  }

  private async apiFetch<T>(path: string): Promise<T> {
    if (isRateLimited()) {
      throw new RateLimitError();
    }

    const url = `${BASE_URL}${path}`;

    // Track every outgoing request for the daily quota counter.
    recordApiRequest();

    // Only the key header is sent. Content-Type is omitted because these are
    // GET requests (no body), and including it causes Cloudflare — which
    // fronts api-sports.io — to strip or reorder the upstream headers so
    // x-apisports-key never reaches the origin, producing the
    // {"token":"Error/Missing application key"} response.
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": this.apiKey,
      },
      cache: "no-store",
    });

    if (res.status === 429) {
      markRateLimited();
      throw new RateLimitError();
    }

    if (!res.ok) {
      const msg = `API-Football HTTP ${res.status}: ${res.statusText} — ${url}`;
      recordApiError(msg);
      throw new Error(msg);
    }

    const body = (await res.json()) as ApiResponse<T>;

    const hasErrors =
      Array.isArray(body.errors)
        ? body.errors.length > 0
        : Object.keys(body.errors).length > 0;

    if (hasErrors) {
      const errorsObj = Array.isArray(body.errors) ? {} : body.errors;
      if (detectPlanRestriction(body.errors)) {
        throw new PlanRestrictionError(errorsObj);
      }
      const msg = `API-Football errors: ${JSON.stringify(body.errors)}`;
      recordApiError(msg);
      throw new Error(msg);
    }

    return body.response;
  }

  async getFixtures(): Promise<Match[]> {
    const fixtures = await this.apiFetch<ApiFixture[]>(
      `/fixtures?league=${EFFECTIVE_LEAGUE_ID}&season=${EFFECTIVE_SEASON}`
    );
    return fixtures.map(mapFixtureToMatch);
  }

  async getLiveMatches(): Promise<Match[]> {
    const fixtures = await this.apiFetch<ApiFixture[]>(
      `/fixtures?live=all&league=${EFFECTIVE_LEAGUE_ID}`
    );
    return fixtures.map(mapFixtureToMatch);
  }

  async getStandings(): Promise<GroupStanding[]> {
    const response = await this.apiFetch<
      Array<{ league: { standings: ApiStandingEntry[][] } }>
    >(`/standings?league=${EFFECTIVE_LEAGUE_ID}&season=${EFFECTIVE_SEASON}`);

    const leagueData = response[0];
    if (!leagueData) return [];

    return leagueData.league.standings.flatMap((group) =>
      group.map((entry) => {
        const groupId = entry.group.replace(/^Group\s+/i, "").trim();
        return mapStandingEntry(entry, groupId);
      })
    );
  }

  async getMatchDetails(matchId: string): Promise<Match | null> {
    const fixtures = await this.apiFetch<ApiFixture[]>(
      `/fixtures?id=${matchId}`
    );
    const first = fixtures[0];
    return first ? mapFixtureToMatch(first) : null;
  }

  async getTopScorers(): Promise<PlayerStat[]> {
    const players = await this.apiFetch<ApiPlayerStats[]>(
      `/players/topscorers?league=${EFFECTIVE_LEAGUE_ID}&season=${EFFECTIVE_SEASON}`
    );
    return players.flatMap((p) => {
      const mapped = mapPlayerStats(p);
      return mapped ? [mapped] : [];
    });
  }

  async getGroups(): Promise<import("@/types").Group[] | null> {
    return null; // groups are implicit in standings data; caller uses built-in mock groups
  }
}
