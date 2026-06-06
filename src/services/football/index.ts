/**
 * Football service entry point.
 *
 * Provider is selected by the FOOTBALL_DATA_PROVIDER env var:
 *
 *   FOOTBALL_DATA_PROVIDER=openfootball  → OpenFootballProvider (free, public dataset)
 *   FOOTBALL_DATA_PROVIDER=api-football  → ApiFootballProvider  (paid API key required)
 *   (unset) + USE_MOCK_DATA=false        → ApiFootballProvider
 *   (unset) or USE_MOCK_DATA=true        → MockProvider         (safe default)
 *
 * All must be called from server-side code (API routes, Server Components only).
 */

import { MockProvider } from "./mockProvider";
import { ApiFootballProvider } from "./apiFootballProvider";
import { OpenFootballProvider } from "./openFootballProvider";
import type { FootballProvider } from "./provider";

export type { FootballProvider };
export { MockProvider } from "./mockProvider";
export { ApiFootballProvider } from "./apiFootballProvider";
export {
  OpenFootballProvider,
  OF_SOURCE_URL,
  getLastFetchAt,
  getCachedOpenFootballStats,
  convertOpenFootballTimeToIsraelTime,
  type OpenFootballStats,
} from "./openFootballProvider";
export { getCached, setCached, clearCache, clearCacheKey, LIVE_TTL, DEFAULT_TTL, AUTH_TTL } from "./cache";
export {
  PlanRestrictionError,
  RateLimitError,
  isRateLimited,
  getRateLimitInfo,
  recordSyncCompleted,
  getSyncState,
  EFFECTIVE_SEASON,
  EFFECTIVE_LEAGUE_ID,
  IS_DEV_MODE,
} from "./apiFootballProvider";

/**
 * Returns the configured FootballProvider based on environment variables.
 * Must only be called from server-side code.
 */
export function getProvider(): FootballProvider {
  const explicitProvider = process.env.FOOTBALL_DATA_PROVIDER?.toLowerCase();

  if (explicitProvider === "openfootball") {
    return new OpenFootballProvider();
  }

  if (explicitProvider === "api-football") {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) throw new Error("[football] API_FOOTBALL_KEY is not set (required for api-football provider).");
    return new ApiFootballProvider(apiKey);
  }

  // Legacy path: USE_MOCK_DATA controls the switch when FOOTBALL_DATA_PROVIDER is absent.
  const useMock = process.env.USE_MOCK_DATA !== "false";
  if (useMock) return new MockProvider();

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("[football] API_FOOTBALL_KEY is not set. Add it to .env.local, or set USE_MOCK_DATA=true.");
  return new ApiFootballProvider(apiKey);
}

/** Human-readable name of the currently configured provider. */
export function getProviderName(): string {
  const explicitProvider = process.env.FOOTBALL_DATA_PROVIDER?.toLowerCase();
  if (explicitProvider === "openfootball") return "OpenFootballProvider";
  if (explicitProvider === "api-football") return "ApiFootballProvider";
  return process.env.USE_MOCK_DATA !== "false" ? "MockProvider" : "ApiFootballProvider";
}
