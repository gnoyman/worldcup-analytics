import { describe, it, expect, beforeAll } from "vitest";
import { GROUPS, MOCK_MATCHES } from "@/data/mockData";
import { calculateAllGroupStandings } from "@/engine/standings/standings";
import { buildWC2026KnockoutBracket } from "@/engine/knockout/knockout";
import { analyzeMatchup, reachProbabilities, winProbability } from "@/engine/matchup/matchup";
import type { GroupStanding, KnockoutMatch } from "@/types";

// ─── Shared fixture ───────────────────────────────────────────────────────────

let standings: GroupStanding[];
let bracket: KnockoutMatch[];

beforeAll(() => {
  standings = calculateAllGroupStandings(GROUPS, MOCK_MATCHES);
  bracket   = buildWC2026KnockoutBracket(standings);
});

// Helpers
function teamPos(groupId: string, position: number): string {
  return standings.find((s) => s.groupId === groupId && s.position === position)!.teamId;
}
function analyze(aId: string, bId: string) {
  return analyzeMatchup(aId, bId, GROUPS, standings, MOCK_MATCHES, bracket);
}
function r32MatchFor(teamId: string): KnockoutMatch | undefined {
  return bracket.find(
    (m) =>
      m.stage === "Round of 32" &&
      (m.homeTeam?.teamId === teamId || m.awayTeam?.teamId === teamId)
  );
}

// ─── Real WC 2026 bracket path reference ────────────────────────────────────
//
//  Slot → R32 → R16 → QF → SF → Final
//
//  1A → r32_7  → r16_4 → qf_3 → sf_2
//  2A → r32_1  → r16_2 → qf_1 → sf_1
//  1B → r32_13 → r16_8 → qf_4 → sf_2
//  2B → r32_1  → r16_2 → qf_1 → sf_1    (same r32 as 2A)
//  1C → r32_4  → r16_3 → qf_3 → sf_2
//  2C → r32_3  → r16_2 → qf_1 → sf_1
//  1D → r32_9  → r16_6 → qf_2 → sf_1
//  2D → r32_16 → r16_7 → qf_4 → sf_2
//  1E → r32_2  → r16_1 → qf_1 → sf_1
//  2E → r32_6  → r16_3 → qf_3 → sf_2
//  1F → r32_3  → r16_2 → qf_1 → sf_1
//  2F → r32_4  → r16_3 → qf_3 → sf_2    (same r32 as 1C)
//  1G → r32_10 → r16_6 → qf_2 → sf_1
//  2G → r32_16 → r16_7 → qf_4 → sf_2    (same r32 as 2D)
//  1H → r32_12 → r16_5 → qf_2 → sf_1
//  2H → r32_14 → r16_7 → qf_4 → sf_2
//  1I → r32_5  → r16_1 → qf_1 → sf_1
//  2I → r32_6  → r16_3 → qf_3 → sf_2    (same r32 as 2E)
//  1J → r32_14 → r16_7 → qf_4 → sf_2
//  2J → r32_12 → r16_5 → qf_2 → sf_1    (same r32 as 1H)
//  1K → r32_15 → r16_8 → qf_4 → sf_2
//  2K → r32_11 → r16_5 → qf_2 → sf_1
//  1L → r32_8  → r16_4 → qf_3 → sf_2
//  2L → r32_11 → r16_5 → qf_2 → sf_1    (same r32 as 2K)

// ─── winProbability ───────────────────────────────────────────────────────────

describe("winProbability", () => {
  it("returns 0.5 for equal-strength teams", () => {
    expect(winProbability(80, 80)).toBe(0.5);
  });

  it("increases with strength advantage", () => {
    const p10 = winProbability(80, 70);
    const p20 = winProbability(80, 60);
    expect(p10).toBeGreaterThan(0.5);
    expect(p20).toBeGreaterThan(p10);
  });

  it("clamps to [0.05, 0.95]", () => {
    expect(winProbability(100, 0)).toBeLessThanOrEqual(0.95);
    expect(winProbability(0, 100)).toBeGreaterThanOrEqual(0.05);
  });
});

// ─── reachProbabilities ───────────────────────────────────────────────────────

describe("reachProbabilities", () => {
  it("returns probability 1.0 for the team's own R32 match", () => {
    // 1D (Group D winner) → r32_9
    const teamId = teamPos("D", 1);
    const probs  = reachProbabilities(teamId, bracket, GROUPS.flatMap((g) => g.teams));
    const r32    = r32MatchFor(teamId)!;
    expect(r32).toBeDefined();
    expect(probs.get(r32.id)).toBe(1);
  });

  it("returns probability ≤ previous stage for each subsequent stage", () => {
    const teamId = teamPos("D", 1);
    const allTeams = GROUPS.flatMap((g) => g.teams);
    const probs  = reachProbabilities(teamId, bracket, allTeams);
    const entries = [...probs.entries()];
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i][1]).toBeLessThanOrEqual(entries[i - 1][1]);
    }
  });

  it("returns empty map for a team not in the bracket (4th in group)", () => {
    const id4th = teamPos("G", 4);
    const probs = reachProbabilities(id4th, bracket, GROUPS.flatMap((g) => g.teams));
    expect(probs.size).toBe(0);
  });
});

// ─── impossible matchup ───────────────────────────────────────────────────────

describe("analyzeMatchup — impossible (team not in bracket)", () => {
  it("canMeetInKnockout=false when a team is 4th in group", () => {
    const g4 = teamPos("G", 4);
    const g1 = teamPos("D", 1);
    const result = analyze(g1, g4);
    expect(result.canMeetInKnockout).toBe(false);
    expect(result.earliestKnockoutStage).toBeNull();
    expect(result.latestKnockoutStage).toBeNull();
    expect(result.meetingProbability).toBe(0);
  });
});

// ─── same R32 match ───────────────────────────────────────────────────────────
//
// r32_4: slot 1C (mock Group C winner) vs slot 2F (mock Group F runner-up).
// Both are in the same bracket match → can only meet in Round of 32.

describe("analyzeMatchup — same R32 match (1C vs 2F = r32_4)", () => {
  it("earliest and latest stage are both Round of 32", () => {
    const c1 = teamPos("C", 1); // 1C → r32_4 home
    const f2 = teamPos("F", 2); // 2F → r32_4 away
    const result = analyze(c1, f2);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Round of 32");
    expect(result.latestKnockoutStage).toBe("Round of 32");
  });

  it("no path conditions required (they start in the same R32 match)", () => {
    const result = analyze(teamPos("C", 1), teamPos("F", 2));
    expect(result.pathConditions.forTeamA).toHaveLength(0);
    expect(result.pathConditions.forTeamB).toHaveLength(0);
  });

  it("meeting probability ≈ 1 (both already in the bracket at R32)", () => {
    const result = analyze(teamPos("C", 1), teamPos("F", 2));
    expect(result.meetingProbability).toBeCloseTo(1, 5);
  });
});

// ─── same R16 match ───────────────────────────────────────────────────────────
//
// r16_3 is fed by:
//   r32_4 (home): 1C (mock Group C winner)
//   r32_6 (away): 2E (mock Group E runner-up)
// → these two teams can first meet in Round of 16.

describe("analyzeMatchup — same R16 match (1C r32_4 + 2E r32_6 → r16_3)", () => {
  it("earliest and latest are both Round of 16", () => {
    const c1 = teamPos("C", 1); // 1C → r32_4 → r16_3 home
    const e2 = teamPos("E", 2); // 2E → r32_6 → r16_3 away
    const result = analyze(c1, e2);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Round of 16");
    expect(result.latestKnockoutStage).toBe("Round of 16");
  });

  it("each team needs exactly 1 win before meeting", () => {
    const result = analyze(teamPos("C", 1), teamPos("E", 2));
    expect(result.pathConditions.forTeamA).toHaveLength(1);
    expect(result.pathConditions.forTeamB).toHaveLength(1);
  });
});

// ─── same QF quadrant ─────────────────────────────────────────────────────────
//
// qf_3 is fed by r16_3 (home) and r16_4 (away).
//   r16_3 ← r32_4 (1C) and r32_6 (2E/2I)
//   r16_4 ← r32_7 (1A) and r32_8 (1L)
// 1C and 1A are in different R16 matches but both feed qf_3 → meet at QF earliest.

describe("analyzeMatchup — same QF quadrant (1A r32_7 + 1C r32_4 → qf_3)", () => {
  it("earliest and latest are both Quarterfinal", () => {
    const a1 = teamPos("A", 1); // 1A → r32_7 → r16_4 → qf_3
    const c1 = teamPos("C", 1); // 1C → r32_4 → r16_3 → qf_3
    const result = analyze(a1, c1);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Quarterfinal");
    expect(result.latestKnockoutStage).toBe("Quarterfinal");
  });

  it("each team needs 2 prior wins before meeting", () => {
    const result = analyze(teamPos("A", 1), teamPos("C", 1));
    expect(result.pathConditions.forTeamA).toHaveLength(2);
    expect(result.pathConditions.forTeamB).toHaveLength(2);
  });
});

// ─── same SF half, different QF quadrants ────────────────────────────────────
//
// sf_2 is fed by qf_3 and qf_4.
//   qf_3 ← 1A, 1C, 2E, 2I, 1L, 3C/E/F/H/I, 3B/E/F/I/J…
//   qf_4 ← 1B, 1J, 1K, 2D, 2G, 2H, 3E/F/G/I/J, 3D/E/I/J/L
// 1A (qf_3 path) and 1B (qf_4 path) can only meet in sf_2.

describe("analyzeMatchup — same SF half, different QF quadrants (1A + 1B → sf_2)", () => {
  it("earliest and latest are both Semifinal", () => {
    const a1 = teamPos("A", 1); // 1A → qf_3 → sf_2
    const b1 = teamPos("B", 1); // 1B → qf_4 → sf_2
    const result = analyze(a1, b1);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Semifinal");
    expect(result.latestKnockoutStage).toBe("Semifinal");
    expect(result.sameGroup).toBe(false);
  });

  it("each team needs 3 wins before meeting", () => {
    const result = analyze(teamPos("A", 1), teamPos("B", 1));
    expect(result.pathConditions.forTeamA).toHaveLength(3);
    expect(result.pathConditions.forTeamB).toHaveLength(3);
  });
});

// ─── same-group 1st vs 2nd: separated into different SF halves ───────────────
//
// In the real WC 2026 bracket, EVERY group's 1st-place and 2nd-place land in
// different SF halves by design. They can only meet in the Final.
// Example: 1B (FRA) → sf_2, 2B (NLD) → sf_1.

describe("analyzeMatchup — same-group 1st vs 2nd (Group B: 1B + 2B)", () => {
  it("flags same group", () => {
    const b1 = teamPos("B", 1);
    const b2 = teamPos("B", 2);
    expect(analyze(b1, b2).sameGroup).toBe(true);
  });

  it("group stage match is identified", () => {
    const result = analyze(teamPos("B", 1), teamPos("B", 2));
    expect(result.groupStageMatchId).toBeDefined();
  });

  it("earliest and latest are both Final (different SF halves by bracket design)", () => {
    // 1B → r32_13 → r16_8 → qf_4 → sf_2
    // 2B → r32_1  → r16_2 → qf_1 → sf_1
    const b1 = teamPos("B", 1);
    const b2 = teamPos("B", 2);
    const result = analyze(b1, b2);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Final");
    expect(result.latestKnockoutStage).toBe("Final");
  });

  it("meeting probability > 0", () => {
    const result = analyze(teamPos("B", 1), teamPos("B", 2));
    expect(result.meetingProbability).toBeGreaterThan(0);
  });
});

// ─── opposite SF halves ───────────────────────────────────────────────────────
//
// 1B → sf_2; 1G → sf_1 → they can only meet in the Final.

describe("analyzeMatchup — opposite SF halves (1B + 1G → Final)", () => {
  it("earliest and latest are both Final", () => {
    const b1 = teamPos("B", 1); // → sf_2
    const g1 = teamPos("G", 1); // → sf_1
    const result = analyze(b1, g1);

    expect(result.canMeetInKnockout).toBe(true);
    expect(result.earliestKnockoutStage).toBe("Final");
    expect(result.latestKnockoutStage).toBe("Final");
  });

  it("requires 4 wins each (R32+R16+QF+SF) before the Final", () => {
    const result = analyze(teamPos("B", 1), teamPos("G", 1));
    expect(result.pathConditions.forTeamA).toHaveLength(4);
    expect(result.pathConditions.forTeamB).toHaveLength(4);
  });

  it("sameGroup is false", () => {
    expect(analyze(teamPos("B", 1), teamPos("G", 1)).sameGroup).toBe(false);
  });
});

// ─── 3rd-place teams ─────────────────────────────────────────────────────────

describe("analyzeMatchup — qualified 3rd-place team", () => {
  it("top-8 3rd-place team can meet other teams in knockout", () => {
    const thirdId = teamPos("A", 3); // 3rd place in Group A
    const r32     = r32MatchFor(thirdId);
    if (!r32) return; // not in top 8 → skip gracefully

    const oppId = teamPos("D", 1);
    const result = analyze(oppId, thirdId);
    expect(result.canMeetInKnockout).toBe(true);
    expect(result.meetingProbability).toBeGreaterThan(0);
  });
});

// ─── Symmetry ─────────────────────────────────────────────────────────────────

describe("analyzeMatchup — symmetry", () => {
  it("earliest/latest stages identical regardless of argument order", () => {
    const b1 = teamPos("B", 1);
    const g1 = teamPos("G", 1);
    const ab = analyze(b1, g1);
    const ba = analyze(g1, b1);

    expect(ab.earliestKnockoutStage).toBe(ba.earliestKnockoutStage);
    expect(ab.latestKnockoutStage).toBe(ba.latestKnockoutStage);
    expect(ab.meetingProbability).toBeCloseTo(ba.meetingProbability, 6);
  });
});

// ─── Probability ordering ─────────────────────────────────────────────────────
//
// Teams chosen to guarantee each meeting stage in the real bracket:
//   R32: 1C vs 2F (r32_4)
//   R16: 1C vs 2E (r16_3)
//   QF:  1C vs 1A (qf_3)
//   SF:  1C vs 1B (sf_2)  — 1C via qf_3, 1B via qf_4, both → sf_2
//   Final: 1C vs 1G       — 1C → sf_2, 1G → sf_1

describe("analyzeMatchup — probability ordering R32 > R16 > QF > SF > Final", () => {
  it("each stage has strictly lower meeting probability than the previous", () => {
    const c1 = teamPos("C", 1); // 1C → r32_4 → r16_3 → qf_3 → sf_2
    const f2 = teamPos("F", 2); // 2F → r32_4 (same match as 1C)
    const e2 = teamPos("E", 2); // 2E → r32_6 → r16_3 (same R16 as 1C)
    const a1 = teamPos("A", 1); // 1A → r32_7 → r16_4 → qf_3 (same QF as 1C)
    const b1 = teamPos("B", 1); // 1B → qf_4 → sf_2 (same SF as 1C)
    const g1 = teamPos("G", 1); // 1G → sf_1 (opposite SF from 1C)

    const pR32 = analyze(c1, f2).meetingProbability;
    const pR16 = analyze(c1, e2).meetingProbability;
    const pQF  = analyze(c1, a1).meetingProbability;
    const pSF  = analyze(c1, b1).meetingProbability;
    const pFin = analyze(c1, g1).meetingProbability;

    expect(pR32).toBeCloseTo(1, 5);
    expect(pR16).toBeLessThan(pR32);
    expect(pQF).toBeLessThan(pR16);
    expect(pSF).toBeLessThan(pQF);
    expect(pFin).toBeLessThan(pSF);
  });
});
