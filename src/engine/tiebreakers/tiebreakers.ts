import { GroupStanding, Match, HeadToHeadRecord } from "@/types";

// ─── Head-to-head helpers ─────────────────────────────────────────────────────

/** Compute H2H record for teamA vs teamB from group matches among a tied subset. */
function h2hRecord(
  teamId: string,
  opponentIds: string[],
  groupMatches: Match[]
): HeadToHeadRecord {
  let points = 0;
  let goalDifference = 0;
  let goalsFor = 0;

  for (const match of groupMatches) {
    if (match.status !== "played") continue;
    if (match.homeScore === undefined || match.awayScore === undefined) continue;

    const isHome = match.homeTeamId === teamId && opponentIds.includes(match.awayTeamId);
    const isAway = match.awayTeamId === teamId && opponentIds.includes(match.homeTeamId);

    if (!isHome && !isAway) continue;

    const gf = isHome ? match.homeScore : match.awayScore;
    const ga = isHome ? match.awayScore : match.homeScore;
    goalsFor += gf;
    goalDifference += gf - ga;

    if (gf > ga) points += 3;
    else if (gf === ga) points += 1;
  }

  return { points, goalDifference, goalsFor };
}

// ─── FIFA tiebreaker logic ────────────────────────────────────────────────────

/**
 * FIFA WC 2026 group stage tiebreaker order (for teams equal on points):
 *
 * Level 1 — Points in all group matches (already equal at this call site)
 * Level 2 — Among tied teams only (H2H mini-table):
 *   2a. Points in H2H matches
 *   2b. Goal difference in H2H matches
 *   2c. Goals scored in H2H matches
 * Level 3 — Overall group record:
 *   3a. Goal difference in all group matches
 *   3b. Goals scored in all group matches
 * Level 4 — Disciplinary (not tracked → skip)
 * Level 5 — FIFA ranking proxy (strengthRating)
 */
export function applyTiebreakersToGroup(
  standings: GroupStanding[],
  groupMatches: Match[]
): GroupStanding[] {
  // Sort in passes: first by points, then resolve ties
  const sorted = resolveGroup([...standings], groupMatches);

  return sorted.map((s, idx) => ({ ...s, position: idx + 1 }));
}

function resolveGroup(
  standings: GroupStanding[],
  groupMatches: Match[]
): GroupStanding[] {
  // Group standings by point bucket
  const buckets = new Map<number, GroupStanding[]>();
  for (const s of standings) {
    const bucket = buckets.get(s.points) ?? [];
    bucket.push(s);
    buckets.set(s.points, bucket);
  }

  // Sort buckets by points desc, resolve ties within each bucket
  const sortedPoints = [...buckets.keys()].sort((a, b) => b - a);
  const result: GroupStanding[] = [];

  for (const pts of sortedPoints) {
    const tied = buckets.get(pts)!;
    if (tied.length === 1) {
      result.push(tied[0]);
    } else {
      result.push(...resolveTie(tied, groupMatches));
    }
  }

  return result;
}

function resolveTie(tied: GroupStanding[], groupMatches: Match[]): GroupStanding[] {
  if (tied.length === 1) return tied;

  const ids = tied.map((s) => s.teamId);

  // Level 2: H2H among tied teams only
  const h2hSorted = [...tied].sort((a, b) => {
    const oppsA = ids.filter((id) => id !== a.teamId);
    const oppsB = ids.filter((id) => id !== b.teamId);
    const ra = h2hRecord(a.teamId, oppsA, groupMatches);
    const rb = h2hRecord(b.teamId, oppsB, groupMatches);

    if (rb.points !== ra.points) return rb.points - ra.points;
    if (rb.goalDifference !== ra.goalDifference) return rb.goalDifference - ra.goalDifference;
    if (rb.goalsFor !== ra.goalsFor) return rb.goalsFor - ra.goalsFor;
    return 0; // fall through to level 3
  });

  // Check if H2H fully resolved the tie
  if (isFullyResolved(h2hSorted, ids, groupMatches)) return h2hSorted;

  // Level 3: overall goal difference / goals scored
  return [...h2hSorted].sort((a, b) => {
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // Level 5: FIFA ranking proxy
    return b.team.strengthRating - a.team.strengthRating;
  });
}

/** Returns true if H2H sorting broke all ties in the group */
function isFullyResolved(
  sorted: GroupStanding[],
  ids: string[],
  groupMatches: Match[]
): boolean {
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const oppsA = ids.filter((id) => id !== a.teamId);
    const oppsB = ids.filter((id) => id !== b.teamId);
    const ra = h2hRecord(a.teamId, oppsA, groupMatches);
    const rb = h2hRecord(b.teamId, oppsB, groupMatches);
    if (
      ra.points === rb.points &&
      ra.goalDifference === rb.goalDifference &&
      ra.goalsFor === rb.goalsFor
    ) {
      return false;
    }
  }
  return true;
}
