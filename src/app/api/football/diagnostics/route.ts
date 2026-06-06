/**
 * GET /api/football/diagnostics
 *
 * Server-only debug endpoint. Split by ?test= query param so each probe
 * only fires when explicitly requested — protecting the free-plan daily quota.
 *
 * ?test=  (absent)    — config + quota info only; makes NO external API calls
 * ?test=auth          — runs GET /countries auth probe (result cached by AUTH_TTL)
 * ?test=fixtures      — runs getFixtures()
 * ?test=standings     — runs getStandings()
 * ?test=topscorers    — runs getTopScorers()
 * ?test=live          — runs getLiveMatches()
 *
 * Every response includes `quota` so the client can always show rate-limit status.
 */

import { type NextRequest } from "next/server";
import { getProvider, getCached, setCached, AUTH_TTL, getProviderName, OF_SOURCE_URL, getLastFetchAt } from "@/services/football";
import {
  API_ID_MAPPING_SIZE,
  EFFECTIVE_SEASON,
  EFFECTIVE_LEAGUE_ID,
  IS_DEV_MODE,
  getRateLimitInfo,
  isRateLimited,
  getSyncState,
} from "@/services/football/apiFootballProvider";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = "https://v3.football.api-sports.io";
const HEADER_NAME = "x-apisports-key";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQuota() {
  const info  = getRateLimitInfo();
  const sync  = getSyncState();
  const cacheTtlHours = parseFloat(process.env.API_CACHE_TTL_HOURS || "24");
  const nextAllowedSync = sync.lastSyncAt !== null
    ? sync.lastSyncAt + cacheTtlHours * 3_600_000
    : null;

  return {
    rateLimited:        info.hit,
    limitHitAt:         info.at,
    devMode:            IS_DEV_MODE,
    syncMode:           process.env.API_SYNC_MODE || "daily",
    cacheTtlHours,
    allowManualRefresh: process.env.API_ALLOW_MANUAL_REFRESH !== "false",
    lastSyncAt:         sync.lastSyncAt,
    nextAllowedSync,
    requestsToday:      sync.requestsToday,
    dailyResetAt:       sync.dailyResetAt,
    lastApiError:       sync.lastApiError,
  };
}

function isPlanRestriction(error: string | null): boolean {
  if (!error) return false;
  return /PlanRestriction|free plan|access.*season|season.*try from/i.test(error);
}

async function timed<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null; durationMs: number }> {
  const start = Date.now();
  try {
    const data = await fn();
    return { data, error: null, durationMs: Date.now() - start };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start };
  }
}

// ── Auth probe ────────────────────────────────────────────────────────────────

interface AuthProbeResult {
  ok: boolean;
  requestUrl: string;
  headerNameUsed: string;
  apiKeyLength: number;
  apiKeyPrefix: string;
  apiKeySuffix: string;
  httpStatus: number | null;
  hasTokenError: boolean;
  tokenErrorMessage: string | null;
  countriesCount: number;
  error: string | null;
  durationMs: number;
}

const AUTH_CACHE_KEY = "diag:auth";

async function probeCountries(): Promise<AuthProbeResult> {
  const start = Date.now();
  const requestUrl = `${API_BASE}/countries`;
  const rawKey = process.env.API_FOOTBALL_KEY ?? "";
  const apiKey = rawKey.trim();

  const keyMeta = {
    requestUrl,
    headerNameUsed: HEADER_NAME,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.length > 0 ? apiKey.substring(0, Math.min(4, apiKey.length)) : "(empty)",
    apiKeySuffix: apiKey.length > 0 ? apiKey.slice(-Math.min(4, apiKey.length)) : "(empty)",
  };

  if (!apiKey) {
    return { ok: false, ...keyMeta, httpStatus: null, hasTokenError: false, tokenErrorMessage: null, countriesCount: 0, error: "API_FOOTBALL_KEY is empty or not set", durationMs: Date.now() - start };
  }

  if (isRateLimited()) {
    return { ok: false, ...keyMeta, httpStatus: null, hasTokenError: false, tokenErrorMessage: null, countriesCount: 0, error: "Skipped — daily API limit reached (429)", durationMs: Date.now() - start };
  }

  try {
    const res = await fetch(requestUrl, { headers: { [HEADER_NAME]: apiKey }, cache: "no-store" });
    const httpStatus = res.status;

    let body: { errors?: Record<string, string> | string[]; response?: unknown };
    try { body = await res.json() as typeof body; }
    catch {
      return { ok: false, ...keyMeta, httpStatus, hasTokenError: false, tokenErrorMessage: null, countriesCount: 0, error: `HTTP ${httpStatus} — body was not JSON`, durationMs: Date.now() - start };
    }

    const errorsObj = Array.isArray(body.errors) ? {} : (body.errors ?? {});
    const hasTokenError = typeof errorsObj.token === "string" && errorsObj.token.length > 0;
    const tokenErrorMessage = hasTokenError ? errorsObj.token : null;
    const allErrors = Array.isArray(body.errors) ? body.errors : Object.values(errorsObj);

    if (allErrors.length > 0) {
      return { ok: false, ...keyMeta, httpStatus, hasTokenError, tokenErrorMessage, countriesCount: 0, error: allErrors.join("; "), durationMs: Date.now() - start };
    }

    const countriesCount = Array.isArray(body.response) ? body.response.length : 0;
    return { ok: true, ...keyMeta, httpStatus, hasTokenError: false, tokenErrorMessage: null, countriesCount, error: null, durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, ...keyMeta, httpStatus: null, hasTokenError: false, tokenErrorMessage: null, countriesCount: 0, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const test = request.nextUrl.searchParams.get("test");
  const isMock = process.env.USE_MOCK_DATA !== "false";
  const rawKey = process.env.API_FOOTBALL_KEY ?? "";
  const hasApiKey = !isMock && rawKey.trim().length > 0;
  const quota = getQuota();

  // ── Config only (no test param) — makes zero external API calls ──────────
  if (!test) {
    return Response.json({
      ok: true,
      data: {
        config: {
          isMock,
          hasApiKey,
          provider: getProviderName(),
          footballDataProvider: process.env.FOOTBALL_DATA_PROVIDER || "auto",
          devMode: isMock ? null : IS_DEV_MODE,
          season: isMock ? null : EFFECTIVE_SEASON,
          leagueId: isMock ? null : EFFECTIVE_LEAGUE_ID,
          idMappingSize: isMock ? null : API_ID_MAPPING_SIZE,
          idMappingPopulated: isMock ? null : API_ID_MAPPING_SIZE > 0,
          syncMode: process.env.API_SYNC_MODE || "daily",
          cacheTtlHours: parseFloat(process.env.API_CACHE_TTL_HOURS || "24"),
          allowManualRefresh: process.env.API_ALLOW_MANUAL_REFRESH !== "false",
          // OpenFootball-specific
          openFootball: process.env.FOOTBALL_DATA_PROVIDER === "openfootball" ? {
            sourceUrl:      OF_SOURCE_URL,
            lastFetchAt:    getLastFetchAt(),
            supportsLive:   false,
            supportsStats:  false,
          } : null,
        },
        quota,
      },
    });
  }

  // ── Auth probe ────────────────────────────────────────────────────────────
  if (test === "auth") {
    if (isMock) {
      return Response.json({ ok: true, data: { authProbe: null, skipped: "mock mode", fromCache: false, quota } });
    }
    const cached = getCached<AuthProbeResult>(AUTH_CACHE_KEY);
    if (cached) {
      return Response.json({ ok: true, data: { authProbe: cached, fromCache: true, quota } });
    }
    const result = await probeCountries();
    // Only cache successful results — don't cache 429 or transient errors
    if (result.ok) setCached(AUTH_CACHE_KEY, result, AUTH_TTL);
    return Response.json({ ok: true, data: { authProbe: result, fromCache: false, quota } });
  }

  // ── Provider data tests ───────────────────────────────────────────────────
  let provider: ReturnType<typeof getProvider>;
  try {
    provider = getProvider();
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }

  if (test === "fixtures") {
    const result = await timed(() => provider.getFixtures());
    const planRestricted = isPlanRestriction(result.error);
    const apifCount = result.data?.filter(f => f.homeTeamId.startsWith("apif_") || f.awayTeamId.startsWith("apif_")).length ?? 0;
    const wc2026Unavailable = !isMock && (EFFECTIVE_SEASON !== 2026 || planRestricted);
    return Response.json({
      ok: true,
      data: {
        fixtures: {
          requestUrl: isMock ? null : `${API_BASE}/fixtures?league=${EFFECTIVE_LEAGUE_ID}&season=${EFFECTIVE_SEASON}`,
          count: result.data?.length ?? 0,
          withApifIds: apifCount,
          planRestricted,
          rateLimited: result.error?.includes("RateLimitError") ?? false,
          durationMs: result.durationMs,
          error: result.error,
        },
        wc2026Unavailable,
        quota,
      },
    });
  }

  if (test === "standings") {
    const result = await timed(() => provider.getStandings());
    const planRestricted = isPlanRestriction(result.error);
    const uniqueGroups = result.data ? new Set(result.data.map(s => s.groupId)).size : 0;
    const wc2026Unavailable = !isMock && (EFFECTIVE_SEASON !== 2026 || planRestricted);
    return Response.json({
      ok: true,
      data: {
        standings: {
          entriesCount: result.data?.length ?? 0,
          groupsCount: uniqueGroups,
          planRestricted,
          rateLimited: result.error?.includes("RateLimitError") ?? false,
          durationMs: result.durationMs,
          error: result.error,
        },
        wc2026Unavailable,
        quota,
      },
    });
  }

  if (test === "topscorers") {
    const result = await timed(() => provider.getTopScorers());
    const planRestricted = isPlanRestriction(result.error);
    return Response.json({
      ok: true,
      data: {
        topScorers: {
          count: result.data?.length ?? 0,
          planRestricted,
          rateLimited: result.error?.includes("RateLimitError") ?? false,
          durationMs: result.durationMs,
          error: result.error,
        },
        quota,
      },
    });
  }

  if (test === "live") {
    const result = await timed(() => provider.getLiveMatches());
    const planRestricted = isPlanRestriction(result.error);
    return Response.json({
      ok: true,
      data: {
        liveMatches: {
          count: result.data?.length ?? 0,
          planRestricted,
          rateLimited: result.error?.includes("RateLimitError") ?? false,
          durationMs: result.durationMs,
          error: result.error,
        },
        quota,
      },
    });
  }

  if (test === "groups") {
    const result = await timed(() => provider.getGroups());
    const groups = result.data;
    const teamNames = groups ? [...new Set(groups.flatMap(g => g.teams.map(t => t.name)))] : [];
    return Response.json({
      ok: true,
      data: {
        groups: {
          count:      groups?.length ?? 0,
          teamCount:  teamNames.length,
          available:  groups !== null,
          durationMs: result.durationMs,
          error:      result.error,
        },
        quota,
      },
    });
  }

  return Response.json({ ok: false, error: `Unknown test: "${test}". Valid values: auth, fixtures, standings, topscorers, live, groups` }, { status: 400 });
}
