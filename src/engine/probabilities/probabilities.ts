import { Team, TeamProbabilities, GroupStanding, Match, Group } from "@/types";
import { simulateTournament } from "@/engine/simulations/simulator";

/**
 * Simple probability engine
 * Uses team strength ratings to estimate probabilities
 * Deterministic approximation (not Monte Carlo for simplicity)
 */

interface StrengthContext {
  teamStrength: number;
  groupAvgStrength: number;
  competitorStrengths: number[];
}

/**
 * Calculate probability to qualify from group
 */
function calculateQualifyProbability(context: StrengthContext): number {
  const strengthAdv = context.teamStrength - context.groupAvgStrength;
  // Stronger teams have higher qualify probability
  let prob = 0.5 + (strengthAdv / 200) * 0.4; // Range 0.1 to 0.9
  return Math.max(0.15, Math.min(0.95, prob));
}

/**
 * Calculate probability to finish 1st in group
 */
function calculateFinishFirstProbability(context: StrengthContext): number {
  const maxCompetitor = Math.max(...context.competitorStrengths);
  const strengthAdv = context.teamStrength - maxCompetitor;
  // Top strength advantage increases chance
  let prob = 0.25 + (strengthAdv / 100) * 0.5;
  return Math.max(0.05, Math.min(0.95, prob));
}

/**
 * Calculate probability to finish 2nd in group
 */
function calculateFinishSecondProbability(
  context: StrengthContext,
  finishFirstProb: number
): number {
  const qualifyProb = calculateQualifyProbability(context);
  // Finish second = qualify probability minus finish first
  const secondProb = qualifyProb - finishFirstProb * 0.3;
  return Math.max(0.05, Math.min(0.5, secondProb));
}

/**
 * Calculate probability to finish 3rd and qualify
 */
function calculateFinishThirdQualifyProbability(
  context: StrengthContext,
  firstProb: number,
  secondProb: number
): number {
  const qualifyProb = calculateQualifyProbability(context);
  const thirdProb = qualifyProb - firstProb - secondProb;
  return Math.max(0.01, Math.min(0.3, thirdProb));
}

/**
 * Calculate playoff probabilities for knockout stages
 */
function calculateKnockoutProbabilities(
  teamStrength: number,
  opponentStrength: number = 75
): Record<string, number> {
  const strengthDiff = teamStrength - opponentStrength;
  const baseWinProb = 0.5 + (strengthDiff / 200) * 0.3;

  return {
    reachRound16: Math.max(0.3, Math.min(0.9, baseWinProb)),
    reachQuarterfinal: Math.max(0.2, Math.min(0.75, baseWinProb * 0.7)),
    reachSemifinal: Math.max(0.1, Math.min(0.6, baseWinProb * 0.5)),
    reachFinal: Math.max(0.05, Math.min(0.4, baseWinProb * 0.3)),
    winTournament: Math.max(0.01, Math.min(0.25, baseWinProb * 0.15)),
  };
}

/**
 * Get context for a team
 */
function getTeamContext(
  team: Team,
  standings: GroupStanding[],
  groups: Group[]
): StrengthContext {
  const teamStanding = standings.find((s) => s.teamId === team.id);
  const group = groups.find((g) => g.id === teamStanding?.groupId);
  const groupTeams = group?.teams || [];

  const groupAvgStrength =
    groupTeams.reduce((sum, t) => sum + t.strengthRating, 0) / groupTeams.length;
  const competitorStrengths = groupTeams
    .filter((t) => t.id !== team.id)
    .map((t) => t.strengthRating);

  return {
    teamStrength: team.strengthRating,
    groupAvgStrength,
    competitorStrengths,
  };
}

/**
 * Calculate comprehensive probabilities for a team
 */
export function calculateTeamProbabilities(
  team: Team,
  standings: GroupStanding[],
  groups: Group[]
): TeamProbabilities {
  const context = getTeamContext(team, standings, groups);

  const qualifyProb = calculateQualifyProbability(context);
  const finishFirstProb = calculateFinishFirstProbability(context);
  const finishSecondProb = calculateFinishSecondProbability(
    context,
    finishFirstProb
  );
  const finishThirdProb = calculateFinishThirdQualifyProbability(
    context,
    finishFirstProb,
    finishSecondProb
  );

  // Adjust if don't qualify
  const dontQualifyProb = 1 - qualifyProb;

  const knockoutProbs = calculateKnockoutProbabilities(team.strengthRating);

  return {
    teamId: team.id,
    team,
    qualifyFromGroup: qualifyProb - dontQualifyProb * 0.1,
    finishFirst: finishFirstProb,
    finishSecond: finishSecondProb,
    finishThird: finishThirdProb,
    reachRound16: qualifyProb * knockoutProbs.reachRound16,
    reachQuarterfinal: qualifyProb * knockoutProbs.reachQuarterfinal,
    reachSemifinal: qualifyProb * knockoutProbs.reachSemifinal,
    reachFinal: qualifyProb * knockoutProbs.reachFinal,
    winTournament: qualifyProb * knockoutProbs.winTournament,
  };
}

/**
 * Calculate probabilities for all teams
 */
export function calculateAllTeamProbabilities(
  standings: GroupStanding[],
  groups: Group[]
): TeamProbabilities[] {
  const allTeams = groups.flatMap((g) => g.teams);
  return allTeams.map((team) =>
    calculateTeamProbabilities(team, standings, groups)
  );
}

/**
 * Calculate probability of two teams meeting
 */
export function calculateTeamMatchupProbability(
  teamAId: string,
  teamBId: string,
  standings: GroupStanding[],
  groups: Group[],
  matches: Match[]
): {
  probability: number;
  possibleStages: string[];
} {
  const teamA = groups.flatMap((g) => g.teams).find((t) => t.id === teamAId);
  const teamB = groups.flatMap((g) => g.teams).find((t) => t.id === teamBId);

  if (!teamA || !teamB) {
    return { probability: 0, possibleStages: [] };
  }

  // Get probabilities for both teams
  const probA = calculateTeamProbabilities(teamA, standings, groups);
  const probB = calculateTeamProbabilities(teamB, standings, groups);

  // Check if same group (could meet in very rare cases, unlikely)
  const groupA = standings.find((s) => s.teamId === teamAId)?.groupId;
  const groupB = standings.find((s) => s.teamId === teamBId)?.groupId;

  const possibleStages: string[] = [];
  let totalProb = 0;

  // Both must qualify first
  const bothQualify = probA.qualifyFromGroup * probB.qualifyFromGroup;

  if (bothQualify > 0.1) {
    // Estimate meeting probabilities in each stage
    // Simplified: proportional to reaching that stage
    if (
      Math.min(probA.reachRound16, probB.reachRound16) > 0.1 &&
      groupA !== groupB
    ) {
      possibleStages.push("Round of 32");
      totalProb += Math.min(probA.reachRound16, probB.reachRound16) * 0.4;
    }

    if (Math.min(probA.reachQuarterfinal, probB.reachQuarterfinal) > 0.1) {
      possibleStages.push("Round of 16");
      totalProb += Math.min(probA.reachQuarterfinal, probB.reachQuarterfinal) * 0.3;
    }

    if (Math.min(probA.reachSemifinal, probB.reachSemifinal) > 0.1) {
      possibleStages.push("Quarterfinal");
      totalProb += Math.min(probA.reachSemifinal, probB.reachSemifinal) * 0.2;
    }

    if (Math.min(probA.reachFinal, probB.reachFinal) > 0.1) {
      possibleStages.push("Semifinal");
      totalProb += Math.min(probA.reachFinal, probB.reachFinal) * 0.08;
    }

    if (Math.min(probA.winTournament, probB.winTournament) > 0.01) {
      possibleStages.push("Final");
      totalProb += Math.min(probA.winTournament, probB.winTournament) * 0.02;
    }
  }

  return {
    probability: Math.min(1, totalProb),
    possibleStages,
  };
}
