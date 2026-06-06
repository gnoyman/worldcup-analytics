/**
 * GET /api/football/live
 *
 * Returns currently in-progress matches.
 * Cache TTL: 30 seconds (live scores change frequently).
 */

import { getProvider, getCached, setCached, LIVE_TTL, PlanRestrictionError, RateLimitError } from "@/services/football";

const CACHE_KEY = "football:live";

export async function GET() {
  try {
    const cached = getCached(CACHE_KEY);
    if (cached !== null) {
      return Response.json({ ok: true, data: cached, source: "cache" });
    }

    const provider = getProvider();
    const data = await provider.getLiveMatches();

    setCached(CACHE_KEY, data, LIVE_TTL);

    return Response.json({ ok: true, data, source: "provider" });
  } catch (error) {
    if (error instanceof PlanRestrictionError) {
      return Response.json({ ok: true, data: [], planRestricted: true });
    }
    if (error instanceof RateLimitError) {
      return Response.json({ ok: true, data: [], rateLimited: true });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
