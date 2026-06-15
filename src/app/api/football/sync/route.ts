/**
 * POST /api/football/sync
 *
 * Manual sync endpoint. Clears the server-side cache for fixtures, standings,
 * and top scorers, then re-fetches from the API in parallel.
 *
 * Respects all quota guards:
 *   • Returns 429-style JSON if the daily rate limit was already hit.
 *   • Returns an error if API_ALLOW_MANUAL_REFRESH=false.
 *   • Skips in mock mode.
 *
 * Response shape on success:
 *   { ok: true, data: { fixtures, standings, topScorers, syncedAt, errors? } }
 */

import {
  getProvider,
  clearCacheKey,
  setCached,
  DEFAULT_TTL,
  isRateLimited,
  recordSyncCompleted,
  FDO_CACHE_MATCHES,
  FDO_CACHE_STANDINGS,
  FDO_CACHE_SCORERS,
} from "@/services/football";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function timed<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null; durationMs: number }> {
  const start = Date.now();
  try {
    const data = await fn();
    return { data, error: null, durationMs: Date.now() - start };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST() {
  // ── Guard: mock mode ─────────────────────────────────────────────────────
  const isMock = process.env.USE_MOCK_DATA !== "false";
  if (isMock) {
    return Response.json({ ok: false, error: "Sync skipped — mock mode is active (USE_MOCK_DATA=true)" });
  }

  // ── Guard: manual refresh disabled ───────────────────────────────────────
  const allowManual = process.env.API_ALLOW_MANUAL_REFRESH !== "false";
  if (!allowManual) {
    return Response.json({ ok: false, error: "Manual refresh is disabled (API_ALLOW_MANUAL_REFRESH=false)" });
  }

  // ── Guard: rate limited ───────────────────────────────────────────────────
  if (isRateLimited()) {
    return Response.json({
      ok: false,
      rateLimited: true,
      error: "מכסת API יומית נוצלה. מוצגים נתונים שמורים/מוקאפ.",
    });
  }

  // ── Get provider ─────────────────────────────────────────────────────────
  let provider: ReturnType<typeof getProvider>;
  try {
    provider = getProvider();
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }

  // ── Clear stale cache so the provider fetches fresh data ─────────────────
  clearCacheKey("football:fixtures");
  clearCacheKey("football:standings");
  clearCacheKey("football:topscorers");
  clearCacheKey("football:groups");
  clearCacheKey("openfootball:wc2026");  // OpenFootball raw JSON cache
  clearCacheKey(FDO_CACHE_MATCHES);      // football-data.org raw matches
  clearCacheKey(FDO_CACHE_STANDINGS);    // football-data.org standings
  clearCacheKey(FDO_CACHE_SCORERS);      // football-data.org scorers

  // ── Fetch all three in parallel ───────────────────────────────────────────
  const [fixtures, standings, topScorers] = await Promise.all([
    timed(() => provider.getFixtures()),
    timed(() => provider.getStandings()),
    timed(() => provider.getTopScorers()),
  ]);

  // ── Check if we hit the rate limit during this sync ───────────────────────
  const hitRateLimit =
    fixtures.error?.includes("RateLimitError") ||
    standings.error?.includes("RateLimitError") ||
    topScorers.error?.includes("RateLimitError");

  if (hitRateLimit) {
    return Response.json({
      ok: false,
      rateLimited: true,
      error: "מכסת API יומית נוצלה. מוצגים נתונים שמורים/מוקאפ.",
    });
  }

  // ── Store successful results in cache ─────────────────────────────────────
  if (fixtures.data)   setCached("football:fixtures",   fixtures.data,   DEFAULT_TTL);
  if (standings.data)  setCached("football:standings",  standings.data,  DEFAULT_TTL);
  if (topScorers.data) setCached("football:topscorers", topScorers.data, DEFAULT_TTL);

  recordSyncCompleted();
  const syncedAt = Date.now();

  // ── Collect non-fatal errors (plan restriction, etc.) ────────────────────
  const errors: string[] = [];
  if (fixtures.error)   errors.push(`fixtures: ${fixtures.error}`);
  if (standings.error)  errors.push(`standings: ${standings.error}`);
  if (topScorers.error) errors.push(`topScorers: ${topScorers.error}`);

  return Response.json({
    ok: true,
    data: {
      fixtures:   fixtures.data   ?? [],
      standings:  standings.data  ?? [],
      topScorers: topScorers.data ?? [],
      syncedAt,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

// ── Block GET — sync is a write operation ─────────────────────────────────────

export async function GET() {
  return Response.json(
    { ok: false, error: "Use POST /api/football/sync to trigger a sync" },
    { status: 405 }
  );
}

