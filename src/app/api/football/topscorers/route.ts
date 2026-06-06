/**
 * GET /api/football/topscorers
 *
 * Returns tournament top scorers sorted by goals.
 * Cache TTL: 5 minutes.
 */

import { getProvider, getCached, setCached, DEFAULT_TTL, PlanRestrictionError, RateLimitError } from "@/services/football";

const CACHE_KEY = "football:topscorers";

export async function GET() {
  try {
    const cached = getCached(CACHE_KEY);
    if (cached !== null) {
      return Response.json({ ok: true, data: cached, source: "cache" });
    }

    const provider = getProvider();
    const data = await provider.getTopScorers();

    setCached(CACHE_KEY, data, DEFAULT_TTL);

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
