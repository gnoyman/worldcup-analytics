/**
 * FootballProvider — server-side data abstraction.
 *
 * Both MockProvider and ApiFootballProvider implement this interface,
 * allowing the application to switch between mock and live data via
 * the USE_MOCK_DATA environment variable without touching any UI code.
 */

import type { Match, GroupStanding, Group } from "@/types";
import type { PlayerStat } from "@/data/mockStats";

export interface FootballProvider {
  /** All group-stage fixtures (played + unplayed). */
  getFixtures(): Promise<Match[]>;

  /** Matches currently in progress. */
  getLiveMatches(): Promise<Match[]>;

  /** Group-stage standings for every group. */
  getStandings(): Promise<GroupStanding[]>;

  /** Full details for a single fixture by its string ID. */
  getMatchDetails(matchId: string): Promise<Match | null>;

  /** Tournament top scorers list. */
  getTopScorers(): Promise<PlayerStat[]>;

  /**
   * Returns the tournament groups (Group[]) when the provider can supply them,
   * or null when the provider relies on the built-in mock groups.
   * OpenFootballProvider returns real WC 2026 groups.
   * MockProvider and ApiFootballProvider return null.
   */
  getGroups(): Promise<Group[] | null>;
}
