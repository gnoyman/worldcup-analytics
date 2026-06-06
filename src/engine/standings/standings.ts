import { GroupStanding, Match, Group } from "@/types";
import { applyTiebreakersToGroup } from "@/engine/tiebreakers/tiebreakers";

export function calculateGroupStandings(
  group: Group,
  matches: Match[]
): GroupStanding[] {
  const standings: GroupStanding[] = group.teams.map((team) => ({
    teamId: team.id,
    team,
    groupId: group.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position: 0,
  }));

  const groupMatches = matches.filter(
    (m) => m.groupId === group.id && m.status === "played"
  );

  for (const match of groupMatches) {
    const home = standings.find((s) => s.teamId === match.homeTeamId);
    const away = standings.find((s) => s.teamId === match.awayTeamId);
    if (!home || !away || match.homeScore === undefined || match.awayScore === undefined) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins++;  home.points += 3;
      away.losses++;
    } else if (match.awayScore > match.homeScore) {
      away.wins++;  away.points += 3;
      home.losses++;
    } else {
      home.draws++;  home.points++;
      away.draws++;  away.points++;
    }
  }

  for (const s of standings) {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  }

  // Pass the group's played matches so tiebreakers can use H2H data
  return applyTiebreakersToGroup(standings, groupMatches);
}

export function calculateAllGroupStandings(
  groups: Group[],
  matches: Match[]
): GroupStanding[] {
  return groups.flatMap((g) => calculateGroupStandings(g, matches));
}

export function getQualifiedTeams(standings: GroupStanding[]) {
  return standings.filter((s) => s.position === 1 || s.position === 2);
}

export function getThirdPlaceTeams(standings: GroupStanding[]) {
  return standings
    .filter((s) => s.position === 3)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.team.strengthRating - a.team.strengthRating;
    });
}

export function getTopEightThirdPlaceTeams(standings: GroupStanding[]) {
  return getThirdPlaceTeams(standings).slice(0, 8);
}
