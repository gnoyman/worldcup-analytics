import { Match, Group, GroupStanding, KnockoutTeam, KnockoutMatch } from "@/types";
import {
  calculateAllGroupStandings,
  getQualifiedTeams,
  getTopEightThirdPlaceTeams,
} from "@/engine/standings/standings";
import { buildWC2026KnockoutBracket } from "@/engine/knockout/knockout";

export interface TournamentSimulation {
  standings: GroupStanding[];
  qualified: GroupStanding[];
  thirdPlace: GroupStanding[];
  topEightThirdPlace: GroupStanding[];
  knockoutMatches: KnockoutMatch[];
}

export function simulateTournament(
  groups: Group[],
  matches: Match[]
): TournamentSimulation {
  const standings = calculateAllGroupStandings(groups, matches);
  const qualified = getQualifiedTeams(standings);
  const thirdPlace = standings.filter((s) => s.position === 3);
  const topEightThirdPlace = getTopEightThirdPlaceTeams(standings);
  const knockoutMatches = buildWC2026KnockoutBracket(standings);

  return { standings, qualified, thirdPlace, topEightThirdPlace, knockoutMatches };
}

export function updateMatchResult(
  matches: Match[],
  matchId: string,
  homeScore: number,
  awayScore: number
): Match[] {
  return matches.map((m) =>
    m.id === matchId
      ? { ...m, homeScore, awayScore, status: "played" as const }
      : m
  );
}

export function getUnplayedMatches(groupId: string, matches: Match[]): Match[] {
  return matches.filter((m) => m.groupId === groupId && m.status === "unplayed");
}

export function getPlayedMatches(groupId: string, matches: Match[]): Match[] {
  return matches.filter((m) => m.groupId === groupId && m.status === "played");
}
