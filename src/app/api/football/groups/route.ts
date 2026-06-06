/**
 * GET /api/football/groups
 *
 * Returns the tournament Group[] from the configured provider when the
 * provider supports it (currently only OpenFootballProvider).
 *
 * Returns { ok: true, data: null } when the provider does not supply groups
 * — callers should fall back to the built-in mock group definitions.
 *
 * Cache TTL: DEFAULT_TTL (24 h when API_CACHE_TTL_HOURS=24).
 */

import { getProvider, getCached, setCached, DEFAULT_TTL } from "@/services/football";
import type { Group } from "@/types";

const CACHE_KEY = "football:groups";

export async function GET() {
  try {
    const cached = getCached<Group[]>(CACHE_KEY);
    if (cached !== null) {
      return Response.json({ ok: true, data: cached, source: "cache" });
    }

    const provider = getProvider();
    const groups = await provider.getGroups();

    if (groups && groups.length > 0) {
      setCached(CACHE_KEY, groups, DEFAULT_TTL);
    }

    return Response.json({ ok: true, data: groups ?? null, source: "provider" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
