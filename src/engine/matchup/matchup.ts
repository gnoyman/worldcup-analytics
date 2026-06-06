import {
  Team,
  Group,
  Match,
  GroupStanding,
  KnockoutMatch,
  KnockoutStage,
  MatchupAnalysis,
} from "@/types";
import { getTeamBracketPath } from "@/engine/knockout/knockout";

// ─── Strength-based win probability ──────────────────────────────────────────

/** P(teamA beats teamB) based on strength ratings alone. */
export function winProbability(strA: number, strB: number): number {
  const diff = strA - strB;
  return Math.max(0.05, Math.min(0.95, 0.5 + diff * 0.005));
}

// ─── Opponent strength estimation ────────────────────────────────────────────

/**
 * Walk backwards from matchId to collect all R32 team IDs that can reach it.
 * Does NOT cross into sibling branches — only walks the specific feeder chain.
 */
function collectFeedingTeams(matchId: string, allMatches: KnockoutMatch[]): string[] {
  const match = allMatches.find((m) => m.id === matchId);
  if (!match) return [];
  if (match.stage === "Round of 32") {
    return [
      ...(match.homeTeam ? [match.homeTeam.teamId] : []),
      ...(match.awayTeam ? [match.awayTeam.teamId] : []),
    ];
  }
  const feeders = allMatches.filter((m) => m.nextMatchId === matchId);
  return feeders.flatMap((f) => collectFeedingTeams(f.id, allMatches));
}

/**
 * Estimate the strength of the expected opponent at position `pathIndex` in
 * the path.  For R32 the opponent is known; for later rounds we average only
 * the teams that could come from the OPPONENT's feeder slot, not from the
 * team's own slot.
 */
function estimateOpponentStrength(
  team: Team,
  match: KnockoutMatch,
  path: string[],
  pathIndex: number,
  allMatches: KnockoutMatch[],
  allTeams: Team[]
): number {
  // R32: opponent is already assigned
  const knownOpponent =
    match.homeTeam?.teamId === team.id ? match.awayTeam :
    match.awayTeam?.teamId === team.id ? match.homeTeam : null;
  if (knownOpponent) {
    return allTeams.find((t) => t.id === knownOpponent.teamId)?.strengthRating ?? 75;
  }

  // Later rounds: find which slot the team occupies via the previous match in
  // its path.  The opponent comes from the feeder of the OTHER slot.
  const prevMatchId = path[pathIndex - 1];
  const prevMatch = prevMatchId ? allMatches.find((m) => m.id === prevMatchId) : undefined;
  const teamSlot = prevMatch?.nextSlot; // "home" | "away" — slot the team fills here

  if (!teamSlot) return 75;

  const opponentSlot: "home" | "away" = teamSlot === "home" ? "away" : "home";
  const opponentFeeder = allMatches.find(
    (m) => m.nextMatchId === match.id && m.nextSlot === opponentSlot
  );
  if (!opponentFeeder) return 75;

  const feedingTeamIds = collectFeedingTeams(opponentFeeder.id, allMatches);
  if (feedingTeamIds.length === 0) return 75;

  const strengths = feedingTeamIds.map(
    (id) => allTeams.find((t) => t.id === id)?.strengthRating ?? 75
  );
  return strengths.reduce((a, b) => a + b, 0) / strengths.length;
}

// ─── P(team reaches each match in its bracket path) ──────────────────────────

/**
 * Returns a map: matchId → P(team has reached that match).
 *
 * "Reached match X" means the team has won ALL prior matches in the path but
 * has NOT yet played match X.  This correctly represents availability for
 * a meeting at that stage.
 *
 * Map also includes matchId of the starting R32 match with probability 1
 * (the team is always "in" their first bracket match).
 */
export function reachProbabilities(
  teamId: string,
  allMatches: KnockoutMatch[],
  allTeams: Team[]
): Map<string, number> {
  const path = getTeamBracketPath(teamId, allMatches);
  const probs = new Map<string, number>();
  const team = allTeams.find((t) => t.id === teamId);
  if (!team || path.length === 0) return probs;

  let runningProb = 1; // probability of having reached this position

  for (let i = 0; i < path.length; i++) {
    const matchId = path[i];
    // P(reaching this match) = product of winning all previous matches
    probs.set(matchId, runningProb);

    const match = allMatches.find((m) => m.id === matchId);
    if (!match) break;

    const opponentStrength = estimateOpponentStrength(team, match, path, i, allMatches, allTeams);
    runningProb *= winProbability(team.strengthRating, opponentStrength);
  }

  return probs;
}

// ─── Main matchup analysis ────────────────────────────────────────────────────

export function analyzeMatchup(
  teamAId: string,
  teamBId: string,
  groups: Group[],
  standings: GroupStanding[],
  matches: Match[],
  knockoutMatches: KnockoutMatch[]
): MatchupAnalysis {
  const allTeams = groups.flatMap((g) => g.teams);
  const teamA = allTeams.find((t) => t.id === teamAId)!;
  const teamB = allTeams.find((t) => t.id === teamBId)!;

  const standingA = standings.find((s) => s.teamId === teamAId);
  const standingB = standings.find((s) => s.teamId === teamBId);
  const sameGroup =
    !!standingA && !!standingB && standingA.groupId === standingB.groupId;

  // Group-stage encounter
  const groupStageMatchId = matches.find(
    (m) =>
      (m.homeTeamId === teamAId && m.awayTeamId === teamBId) ||
      (m.homeTeamId === teamBId && m.awayTeamId === teamAId)
  )?.id;

  // Bracket paths
  const pathA = getTeamBracketPath(teamAId, knockoutMatches);
  const pathB = getTeamBracketPath(teamBId, knockoutMatches);

  // If either team is not in the bracket they cannot meet in the knockout
  if (pathA.length === 0 || pathB.length === 0) {
    return {
      teamA, teamB, sameGroup, groupStageMatchId,
      canMeetInKnockout: false,
      earliestKnockoutStage: null,
      latestKnockoutStage: null,
      projectedMeetingStage: null,
      meetingProbability: 0,
      pathConditions: { forTeamA: [], forTeamB: [] },
    };
  }

  // ── Earliest possible meeting ─────────────────────────────────────────────
  // First match ID that appears in BOTH paths (traversing A's path in order)
  const pathBSet = new Set(pathB);
  let convergenceId: string | null = null;
  for (const id of pathA) {
    if (pathBSet.has(id)) { convergenceId = id; break; }
  }

  const convergenceMatch = convergenceId
    ? knockoutMatches.find((m) => m.id === convergenceId)
    : null;
  const earliestKnockoutStage = (convergenceMatch?.stage ?? null) as KnockoutStage | null;

  // ── Latest possible meeting ───────────────────────────────────────────────
  // Once two teams converge at a match, only one can advance past it.
  // Therefore the latest stage they can meet is the SAME as the earliest.
  // (Exception: "Final" — both teams arrive through separate SF halves so
  // both can simultaneously reach the Final.)
  const latestKnockoutStage = earliestKnockoutStage;

  // Projected meeting stage equals the earliest (deterministic bracket)
  const projectedMeetingStage = earliestKnockoutStage;

  // ── Meeting probability ───────────────────────────────────────────────────
  // P(A reaches convergence) × P(B reaches convergence)
  // "Reaches" = has won all prior matches; they haven't yet played the
  // convergence match itself.
  const probsA = reachProbabilities(teamAId, knockoutMatches, allTeams);
  const probsB = reachProbabilities(teamBId, knockoutMatches, allTeams);

  const pA = convergenceId ? (probsA.get(convergenceId) ?? 0) : 0;
  const pB = convergenceId ? (probsB.get(convergenceId) ?? 0) : 0;
  const meetingProbability = Math.min(1, pA * pB);

  // ── Required path conditions ──────────────────────────────────────────────
  const conditions = buildConditions(
    teamA, teamB, pathA, pathB, knockoutMatches, convergenceId
  );

  return {
    teamA, teamB, sameGroup, groupStageMatchId,
    canMeetInKnockout: earliestKnockoutStage !== null,
    earliestKnockoutStage,
    latestKnockoutStage,
    projectedMeetingStage,
    meetingProbability,
    pathConditions: conditions,
  };
}

function buildConditions(
  teamA: Team,
  teamB: Team,
  pathA: string[],
  pathB: string[],
  allMatches: KnockoutMatch[],
  convergenceId: string | null
): { forTeamA: string[]; forTeamB: string[] } {
  if (!convergenceId) return { forTeamA: [], forTeamB: [] };

  const stagesBeforeConvergence = (path: string[]) => {
    const idx = path.indexOf(convergenceId);
    return idx > 0 ? path.slice(0, idx) : [];
  };

  const describe = (matchId: string, subject: Team): string => {
    const m = allMatches.find((x) => x.id === matchId);
    if (!m) return matchId;
    const opp = m.homeTeam?.teamId === subject.id ? m.awayTeam : m.homeTeam;
    const label = stageLabel(m.stage);
    return opp ? `לנצח את ${opp.team.name} ב${label}` : `לנצח ב${label}`;
  };

  return {
    forTeamA: stagesBeforeConvergence(pathA).map((id) => describe(id, teamA)),
    forTeamB: stagesBeforeConvergence(pathB).map((id) => describe(id, teamB)),
  };
}

function stageLabel(stage: KnockoutStage): string {
  const labels: Record<KnockoutStage, string> = {
    "Round of 32":  "שלב 32",
    "Round of 16":  "שמינית גמר",
    "Quarterfinal": "רביע גמר",
    "Semifinal":    "חצי גמר",
    "Final":        "גמר",
  };
  return labels[stage];
}

// ─── Matchup matrix ───────────────────────────────────────────────────────────

export interface MatrixEntry {
  teamAId: string;
  teamBId: string;
  probability: number;
  earliestStage: KnockoutStage | null;
}

export function computeMatchupMatrix(
  teamIds: string[],
  groups: Group[],
  standings: GroupStanding[],
  matches: Match[],
  knockoutMatches: KnockoutMatch[]
): MatrixEntry[] {
  const entries: MatrixEntry[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = analyzeMatchup(
        teamIds[i], teamIds[j], groups, standings, matches, knockoutMatches
      );
      entries.push({
        teamAId: teamIds[i], teamBId: teamIds[j],
        probability: a.meetingProbability, earliestStage: a.earliestKnockoutStage,
      });
    }
  }
  return entries;
}

export function getMatrixEntry(
  teamAId: string,
  teamBId: string,
  entries: MatrixEntry[]
): MatrixEntry | undefined {
  return entries.find(
    (e) =>
      (e.teamAId === teamAId && e.teamBId === teamBId) ||
      (e.teamAId === teamBId && e.teamBId === teamAId)
  );
}
