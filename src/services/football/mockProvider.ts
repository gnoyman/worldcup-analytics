/**
 * MockProvider — FootballProvider backed by static mock data.
 *
 * Used when USE_MOCK_DATA=true (the default). Wraps the existing
 * GROUPS / MOCK_MATCHES / MOCK_PLAYERS so the API routes work
 * identically to the live provider without touching any UI code.
 */

import type { FootballProvider } from "./provider";
import type { Match, GroupStanding, Group } from "@/types";
import type { PlayerStat } from "@/data/mockStats";
import { GROUPS, MOCK_MATCHES } from "@/data/mockData";
import { MOCK_PLAYERS } from "@/data/mockStats";
import { calculateAllGroupStandings } from "@/engine/standings/standings";

export class MockProvider implements FootballProvider {
  async getFixtures(): Promise<Match[]> {
    return MOCK_MATCHES;
  }

  async getLiveMatches(): Promise<Match[]> {
    // Simulate "live" by surfacing the three most recently played matches.
    return MOCK_MATCHES.filter((m) => m.status === "played").slice(-3);
  }

  async getStandings(): Promise<GroupStanding[]> {
    return calculateAllGroupStandings(GROUPS, MOCK_MATCHES);
  }

  async getMatchDetails(matchId: string): Promise<Match | null> {
    return MOCK_MATCHES.find((m) => m.id === matchId) ?? null;
  }

  async getTopScorers(): Promise<PlayerStat[]> {
    return [...MOCK_PLAYERS].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  }

  async getGroups(): Promise<Group[] | null> {
    return null; // caller falls back to built-in mock groups
  }
}
