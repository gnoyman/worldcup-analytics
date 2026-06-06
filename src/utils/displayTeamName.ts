import type { Team } from "@/types";

/**
 * Returns the Hebrew display name for a team, with no English code or abbreviation.
 * Use this everywhere a team name is rendered in the UI.
 */
export function getDisplayTeamName(team: Pick<Team, "name">): string {
  return team.name;
}
