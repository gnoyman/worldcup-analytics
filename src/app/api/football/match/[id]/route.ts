/**
 * GET /api/football/match/:id
 *
 * Returns full details for a single fixture.
 * Cache TTL: 5 minutes.
 */

import { type NextRequest } from "next/server";
import { getProvider, getCached, setCached, DEFAULT_TTL } from "@/services/football";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.trim() === "") {
    return Response.json({ ok: false, error: "Match ID is required" }, { status: 400 });
  }

  const cacheKey = `football:match:${id}`;

  try {
    const cached = getCached(cacheKey);
    if (cached !== null) {
      return Response.json({ ok: true, data: cached, source: "cache" });
    }

    const provider = getProvider();
    const data = await provider.getMatchDetails(id);

    if (data === null) {
      return Response.json({ ok: false, error: `Match ${id} not found` }, { status: 404 });
    }

    setCached(cacheKey, data, DEFAULT_TTL);

    return Response.json({ ok: true, data, source: "provider" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
