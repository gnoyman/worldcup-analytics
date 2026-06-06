import { describe, it, expect, beforeAll } from "vitest";
import { GROUPS, MOCK_MATCHES } from "@/data/mockData";
import { runMonteCarlo, makeRng, DEFAULT_ITERATIONS } from "@/engine/monteCarlo/monteCarlo";
import type { MCTeamResult, MonteCarloResult } from "@/types";

// ─── Shared fixture ───────────────────────────────────────────────────────────
// Use a seeded RNG so tests are deterministic across runs.

let result: MonteCarloResult;

beforeAll(() => {
  result = runMonteCarlo(GROUPS, MOCK_MATCHES, DEFAULT_ITERATIONS, makeRng(42));
});

// ─── Output shape ─────────────────────────────────────────────────────────────

describe("runMonteCarlo — output shape", () => {
  it("returns the correct number of iterations", () => {
    expect(result.iterations).toBe(DEFAULT_ITERATIONS);
  });

  it("returns one MCTeamResult per team (48 teams)", () => {
    expect(result.teams).toHaveLength(48);
  });

  it("includes every team from GROUPS exactly once", () => {
    const allTeamIds = new Set(GROUPS.flatMap(g => g.teams.map(t => t.id)));
    const resultIds  = new Set(result.teams.map(t => t.teamId));
    expect(resultIds).toEqual(allTeamIds);
  });

  it("records computedAt and durationMs", () => {
    expect(result.computedAt).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── All probabilities in [0, 1] ─────────────────────────────────────────────

describe("runMonteCarlo — probabilities in [0, 1]", () => {
  const fields: Array<keyof MCTeamResult> = [
    "qualifyFromGroup", "finishFirst", "finishSecond", "finishThirdQualify",
    "reachRound32", "reachRound16", "reachQuarterfinal",
    "reachSemifinal", "reachFinal", "winTournament",
  ];

  for (const field of fields) {
    it(`${field} is in [0, 1] for all teams`, () => {
      for (const t of result.teams) {
        const v = t[field] as number;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  }
});

// ─── Monotonic ordering: win ≤ final ≤ semi ≤ QF ≤ R16 ≤ R32 ─────────────────

describe("runMonteCarlo — knockout stage ordering (coherence)", () => {
  it("winTournament ≤ reachFinal for every team", () => {
    for (const t of result.teams) {
      expect(t.winTournament).toBeLessThanOrEqual(t.reachFinal + 1e-9);
    }
  });

  it("reachFinal ≤ reachSemifinal for every team", () => {
    for (const t of result.teams) {
      expect(t.reachFinal).toBeLessThanOrEqual(t.reachSemifinal + 1e-9);
    }
  });

  it("reachSemifinal ≤ reachQuarterfinal for every team", () => {
    for (const t of result.teams) {
      expect(t.reachSemifinal).toBeLessThanOrEqual(t.reachQuarterfinal + 1e-9);
    }
  });

  it("reachQuarterfinal ≤ reachRound16 for every team", () => {
    for (const t of result.teams) {
      expect(t.reachQuarterfinal).toBeLessThanOrEqual(t.reachRound16 + 1e-9);
    }
  });

  it("reachRound16 ≤ reachRound32 for every team", () => {
    for (const t of result.teams) {
      expect(t.reachRound16).toBeLessThanOrEqual(t.reachRound32 + 1e-9);
    }
  });

  it("reachRound32 ≤ qualifyFromGroup + 1e-9", () => {
    for (const t of result.teams) {
      expect(t.reachRound32).toBeLessThanOrEqual(t.qualifyFromGroup + 1e-9);
    }
  });

  it("qualifyFromGroup ≤ 1 for every team", () => {
    for (const t of result.teams) {
      expect(t.qualifyFromGroup).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Group-stage probability coherence ────────────────────────────────────────

describe("runMonteCarlo — group-stage coherence", () => {
  it("sum of finishFirst across all 48 teams ≈ 12 (one per group)", () => {
    const sum = result.teams.reduce((s, t) => s + t.finishFirst, 0);
    // 12 groups × 1 winner each = 12, scaled to [0,1] per team
    expect(sum).toBeCloseTo(12, 0); // within ±0.5 over 5000 iterations
  });

  it("sum of finishSecond across all 48 teams ≈ 12", () => {
    const sum = result.teams.reduce((s, t) => s + t.finishSecond, 0);
    expect(sum).toBeCloseTo(12, 0);
  });

  it("sum of qualifyFromGroup across all 48 teams ≈ 32", () => {
    // 24 via 1st/2nd + 8 via best 3rd = 32 qualifiers per iteration
    const sum = result.teams.reduce((s, t) => s + t.qualifyFromGroup, 0);
    expect(sum).toBeCloseTo(32, 0);
  });

  it("within each group: sum of (1st+2nd+3rdQual) is ≤ 2", () => {
    for (const group of GROUPS) {
      const groupTeamIds = new Set(group.teams.map(t => t.id));
      const groupTeams = result.teams.filter(t => groupTeamIds.has(t.teamId));
      const sum1st2nd = groupTeams.reduce((s, t) => s + t.finishFirst + t.finishSecond, 0);
      // 1st and 2nd place are always in R32, so their sum = 2
      expect(sum1st2nd).toBeCloseTo(2, 0);
    }
  });

  it("sum of winTournament across all teams ≈ 1", () => {
    const sum = result.teams.reduce((s, t) => s + t.winTournament, 0);
    expect(sum).toBeCloseTo(1, 1); // within ±0.05 over 5000 iterations
  });
});

// ─── Strong teams have higher probabilities ───────────────────────────────────

describe("runMonteCarlo — sanity: strong teams win more", () => {
  it("BRA (str=94) has higher winTournament than BIH (str=72)", () => {
    const bra = result.teams.find(t => t.teamId === "bra")!;
    const bih = result.teams.find(t => t.teamId === "bih")!;
    expect(bra.winTournament).toBeGreaterThan(bih.winTournament);
  });

  it("FRA (str=93) has higher winTournament than UAE (str=68)", () => {
    const fra = result.teams.find(t => t.teamId === "fra")!;
    const uae = result.teams.find(t => t.teamId === "uae")!;
    expect(fra.winTournament).toBeGreaterThan(uae.winTournament);
  });

  it("top-5 teams by winTournament all have strengthRating > 85", () => {
    const allTeams = GROUPS.flatMap(g => g.teams);
    const strById  = new Map(allTeams.map(t => [t.id, t.strengthRating]));
    const top5 = [...result.teams]
      .sort((a, b) => b.winTournament - a.winTournament)
      .slice(0, 5);
    for (const t of top5) {
      expect(strById.get(t.teamId)!).toBeGreaterThan(85);
    }
  });
});

// ─── Determinism with seeded RNG ──────────────────────────────────────────────

describe("runMonteCarlo — determinism", () => {
  it("produces the same result for the same seed", () => {
    const r1 = runMonteCarlo(GROUPS, MOCK_MATCHES, 200, makeRng(99));
    const r2 = runMonteCarlo(GROUPS, MOCK_MATCHES, 200, makeRng(99));
    const fra1 = r1.teams.find(t => t.teamId === "fra")!;
    const fra2 = r2.teams.find(t => t.teamId === "fra")!;
    expect(fra1.winTournament).toBe(fra2.winTournament);
    expect(fra1.reachFinal).toBe(fra2.reachFinal);
  });

  it("produces different results for different seeds", () => {
    const r1 = runMonteCarlo(GROUPS, MOCK_MATCHES, 500, makeRng(1));
    const r2 = runMonteCarlo(GROUPS, MOCK_MATCHES, 500, makeRng(9999));
    const fra1 = r1.teams.find(t => t.teamId === "fra")!;
    const fra2 = r2.teams.find(t => t.teamId === "fra")!;
    // With 500 iterations, results differ across seeds
    expect(fra1.winTournament).not.toBe(fra2.winTournament);
  });
});

// ─── Convergence with more iterations ────────────────────────────────────────

describe("runMonteCarlo — convergence", () => {
  it("results converge as iterations increase (error < 5% for 5000 iters)", () => {
    const r5k = runMonteCarlo(GROUPS, MOCK_MATCHES, 5000, makeRng(7));
    const r10k = runMonteCarlo(GROUPS, MOCK_MATCHES, 10_000, makeRng(7));

    // Compare FRA's qualify probability — should be very close
    const fra5k  = r5k.teams.find(t => t.teamId === "fra")!;
    const fra10k = r10k.teams.find(t => t.teamId === "fra")!;

    expect(Math.abs(fra5k.qualifyFromGroup - fra10k.qualifyFromGroup)).toBeLessThan(0.05);
  });
});
