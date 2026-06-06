/**
 * Self-contained Monte Carlo simulation engine for WC2026.
 *
 * Deliberately avoids importing the heavy TypeScript engine layer so the
 * inner loop stays fast.  Replicates only the logic needed for simulation:
 *   • Poisson goal sampling
 *   • Group standings with H2H tiebreakers
 *   • 3rd-place ranking
 *   • WC2026 bracket seeding + knockout simulation
 */

import type { Group, Match, MCTeamResult, MonteCarloResult } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_ITERATIONS =
  process.env.NODE_ENV === "production" ? 10_000 : 1_000;
const BASE_GOALS = 1.3;   // average goals per team per game
const AVG_STR    = 75;    // normalisation baseline
const HOME_ADV   = 1.08;  // small neutral-venue advantage for the "home" slot

// ─── Seeded PRNG (xorshift32) — used for deterministic tests ─────────────────

export function makeRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s = s >>> 0;
    return s / 4_294_967_296;
  };
}

// ─── Goal simulation ──────────────────────────────────────────────────────────

function poissonSample(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  // Knuth algorithm — fast for small λ
  const L = Math.exp(-Math.min(lambda, 20));
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

function simulateScore(
  homeStr: number,
  awayStr: number,
  rng: () => number
): [number, number] {
  const lh = BASE_GOALS * (homeStr / AVG_STR) * HOME_ADV;
  const la = BASE_GOALS * (awayStr / AVG_STR);
  return [poissonSample(lh, rng), poissonSample(la, rng)];
}

/** Simulate one knockout match.  Draws resolved by weighted coin (penalties). */
function knockoutWinner(
  homeId: string, awayId: string,
  homeStr: number, awayStr: number,
  rng: () => number
): string {
  const [hg, ag] = simulateScore(homeStr, awayStr, rng);
  if (hg !== ag) return hg > ag ? homeId : awayId;
  // Penalties: slight bias toward the stronger team
  const pHome = 0.5 + (homeStr - awayStr) * 0.002;
  return rng() < Math.max(0.1, Math.min(0.9, pHome)) ? homeId : awayId;
}

// ─── Group simulation ─────────────────────────────────────────────────────────

interface GroupSim {
  order: string[];   // [1st, 2nd, 3rd, 4th] team IDs
  thirdPts: number;
  thirdGd: number;
  thirdGf: number;
  thirdStr: number;
}

/**
 * Simulate (or replay) all 6 group matches, return the sorted standings.
 * playedResults: "minIdx,maxIdx" → [goals for minIdx team, goals for maxIdx team]
 */
function simulateGroup(
  teamIds: string[],
  strengths: number[],
  playedResults: Map<string, [number, number]>,
  rng: () => number
): GroupSim {
  const pts = [0, 0, 0, 0];
  const gf  = [0, 0, 0, 0];
  const ga  = [0, 0, 0, 0];
  type MatchRec = [number, number, number, number]; // [i, j, ig, jg]
  const recs: MatchRec[] = [];

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const played = playedResults.get(`${i},${j}`);
      const [ig, jg] = played ?? simulateScore(strengths[i], strengths[j], rng);
      recs.push([i, j, ig, jg]);
      gf[i] += ig; ga[i] += jg;
      gf[j] += jg; ga[j] += ig;
      if      (ig > jg) pts[i] += 3;
      else if (jg > ig) pts[j] += 3;
      else              { pts[i]++; pts[j]++; }
    }
  }

  const gd = gf.map((g, k) => g - ga[k]);

  // H2H record for team `a` against one opponent `b` (2-way tie helper)
  function h2h(a: number, b: number) {
    let p = 0, gdiff = 0, gfh = 0;
    for (const [ri, rj, ig, jg] of recs) {
      if (ri === a && rj === b) { p += ig > jg ? 3 : ig === jg ? 1 : 0; gdiff += ig - jg; gfh += ig; }
      if (ri === b && rj === a) { p += jg > ig ? 3 : jg === ig ? 1 : 0; gdiff += jg - ig; gfh += jg; }
    }
    return { p, gdiff, gfh };
  }

  const sorted = [0, 1, 2, 3].sort((a, b) => {
    if (pts[b] !== pts[a]) return pts[b] - pts[a];

    // For 2-way ties apply H2H; for multi-way ties fall to overall GD/GF/strength
    const tiedCount = [0,1,2,3].filter(t => pts[t] === pts[a]).length;
    if (tiedCount === 2) {
      const ha = h2h(a, b), hb = h2h(b, a);
      if (ha.p     !== hb.p)     return hb.p     - ha.p;
      if (ha.gdiff !== hb.gdiff) return hb.gdiff - ha.gdiff;
      if (ha.gfh   !== hb.gfh)   return hb.gfh   - ha.gfh;
    }

    if (gd[b] !== gd[a]) return gd[b] - gd[a];
    if (gf[b] !== gf[a]) return gf[b] - gf[a];
    return strengths[b] - strengths[a]; // strength proxy for FIFA ranking
  });

  const thirdIdx = sorted[2];
  return {
    order:    sorted.map(i => teamIds[i]),
    thirdPts: pts[thirdIdx],
    thirdGd:  gd[thirdIdx],
    thirdGf:  gf[thirdIdx],
    thirdStr: strengths[thirdIdx],
  };
}

// ─── 3rd-place ranking ────────────────────────────────────────────────────────

interface ThirdInfo {
  teamId: string;
  pts: number;
  gd: number;
  gf: number;
  str: number;
}

function rankThirdPlace(thirds: ThirdInfo[]): string[] {
  return [...thirds]
    .sort((a, b) =>
      b.pts - a.pts ||
      b.gd  - a.gd  ||
      b.gf  - a.gf  ||
      b.str - a.str)
    .slice(0, 8)
    .map(t => t.teamId);
}

// ─── Bracket seeding ──────────────────────────────────────────────────────────

/**
 * Returns 16 R32 pairs [homeTeam, awayTeam] in bracket order.
 * Groups A–F → SF Half 1, Groups G–L → SF Half 2.
 */
function buildBracket(
  standings: Map<string, string[]>,
  top8Third: string[]
): [string, string][] {
  const g = (grp: string, pos: number) => standings.get(grp)?.[pos - 1] ?? "";
  const t = (rank: number) => top8Third[rank] ?? "";
  return [
    [g("A",1), g("F",2)], [g("B",1), g("E",2)],
    [g("C",1), g("D",2)], [t(0),     t(1)    ],
    [g("D",1), g("C",2)], [g("E",1), g("B",2)],
    [g("F",1), g("A",2)], [t(2),     t(3)    ],
    [g("G",1), g("L",2)], [g("H",1), g("K",2)],
    [g("I",1), g("J",2)], [t(4),     t(5)    ],
    [g("J",1), g("I",2)], [g("K",1), g("H",2)],
    [g("L",1), g("G",2)], [t(6),     t(7)    ],
  ];
}

// ─── Knockout simulation ──────────────────────────────────────────────────────

/**
 * Stage indices stored per team:
 *   0 = reached Round of 32  (qualified from group)
 *   1 = reached Round of 16
 *   2 = reached Quarterfinal
 *   3 = reached Semifinal
 *   4 = reached Final
 *   5 = won Tournament
 */
function simulateKnockout(
  r32Pairs: [string, string][],
  strMap: Map<string, number>,
  rng: () => number,
  stageCounts: Record<string, number[]>
): void {
  // Mark all bracket teams as having reached R32 (stage 0)
  for (const [h, a] of r32Pairs) {
    if (h) { stageCounts[h] ??= new Array(9).fill(0); stageCounts[h][0]++; }
    if (a) { stageCounts[a] ??= new Array(9).fill(0); stageCounts[a][0]++; }
  }

  let current = r32Pairs;

  for (let round = 0; round < 5; round++) {
    const winners: string[] = [];

    for (const [h, a] of current) {
      if (!h && !a) { winners.push(""); continue; }
      if (!h) { winners.push(a); continue; }
      if (!a) { winners.push(h); continue; }
      winners.push(
        knockoutWinner(h, a, strMap.get(h) ?? 75, strMap.get(a) ?? 75, rng)
      );
    }

    const nextStage = round + 1; // 1=R16 … 5=Win
    for (const w of winners) {
      if (w) { stageCounts[w] ??= new Array(9).fill(0); stageCounts[w][nextStage]++; }
    }

    if (round === 4) return; // Final done

    // Pair winners: [w0,w1], [w2,w3], …
    const next: [string, string][] = [];
    for (let i = 0; i < winners.length; i += 2) {
      next.push([winners[i] ?? "", winners[i + 1] ?? ""]);
    }
    current = next;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a Monte Carlo simulation of the remaining tournament.
 *
 * Already-played matches are replayed exactly; unplayed matches are simulated
 * with Poisson-distributed goal counts scaled by team strength ratings.
 *
 * @param groups  All 12 groups with team data
 * @param matches Current match state (mix of played + unplayed)
 * @param iterations Number of MC iterations (default 5 000)
 * @param rng     Optional RNG — defaults to Math.random (pass makeRng(seed) for tests)
 */
export function runMonteCarlo(
  groups: Group[],
  matches: Match[],
  iterations = DEFAULT_ITERATIONS,
  rng: () => number = Math.random
): MonteCarloResult {
  const t0 = Date.now();

  // ── Pre-processing ─────────────────────────────────────────────────────────

  const allTeams = groups.flatMap(g => g.teams);
  const strMap   = new Map<string, number>(allTeams.map(t => [t.id, t.strengthRating]));

  // Per-team accumulators [r32, r16, qf, sf, final, win, 1st, 2nd, 3rdQual]
  const counts: Record<string, number[]> = {};
  for (const t of allTeams) counts[t.id] = new Array(9).fill(0);

  // Pre-compute played results per group as canonical "i,j" keys
  type PlayedMap = Map<string, [number, number]>;
  const groupData = groups.map(group => {
    const teamIds   = group.teams.map(t => t.id);
    const strengths = group.teams.map(t => t.strengthRating);
    const played: PlayedMap = new Map();

    for (const m of matches) {
      if (m.groupId !== group.id || m.status !== "played") continue;
      if (m.homeScore == null || m.awayScore == null) continue;
      const hi = teamIds.indexOf(m.homeTeamId);
      const ai = teamIds.indexOf(m.awayTeamId);
      if (hi < 0 || ai < 0) continue;
      if (hi < ai) played.set(`${hi},${ai}`, [m.homeScore, m.awayScore]);
      else         played.set(`${ai},${hi}`, [m.awayScore, m.homeScore]);
    }

    return { id: group.id, teamIds, strengths, played };
  });

  // ── Iteration loop ─────────────────────────────────────────────────────────

  for (let iter = 0; iter < iterations; iter++) {
    const groupStandings = new Map<string, string[]>();
    const thirds: ThirdInfo[] = [];

    for (const { id, teamIds, strengths, played } of groupData) {
      const sim = simulateGroup(teamIds, strengths, played, rng);
      groupStandings.set(id, sim.order);

      // Track group finish position
      counts[sim.order[0]][6]++; // 1st
      counts[sim.order[1]][7]++; // 2nd

      thirds.push({
        teamId: sim.order[2],
        pts:    sim.thirdPts,
        gd:     sim.thirdGd,
        gf:     sim.thirdGf,
        str:    sim.thirdStr,
      });
    }

    const top8Third = rankThirdPlace(thirds);

    // Track 3rd-place qualifiers
    for (const tid of top8Third) counts[tid][8]++;

    const bracket = buildBracket(groupStandings, top8Third);
    simulateKnockout(bracket, strMap, rng, counts);
  }

  // ── Build result ───────────────────────────────────────────────────────────

  const teams: MCTeamResult[] = allTeams.map(t => {
    const c = counts[t.id] ?? new Array(9).fill(0);
    const N = iterations;
    return {
      teamId:            t.id,
      qualifyFromGroup:  c[0] / N,
      reachRound32:      c[0] / N,
      reachRound16:      c[1] / N,
      reachQuarterfinal: c[2] / N,
      reachSemifinal:    c[3] / N,
      reachFinal:        c[4] / N,
      winTournament:     c[5] / N,
      finishFirst:       c[6] / N,
      finishSecond:      c[7] / N,
      finishThirdQualify:c[8] / N,
    };
  });

  return {
    iterations,
    teams,
    computedAt: Date.now(),
    durationMs: Date.now() - t0,
  };
}
