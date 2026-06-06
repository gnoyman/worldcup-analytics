import { describe, it, expect } from "vitest";
import { GROUPS, MOCK_MATCHES } from "@/data/mockData";
import { calculateAllGroupStandings } from "@/engine/standings/standings";
import {
  buildWC2026KnockoutBracket,
  slotLabelHebrew,
  resolveBracketSlotLabel,
  advanceWinner,
} from "@/engine/knockout/knockout";
import type { GroupStanding, KnockoutMatch } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * "Unplayed" standings: positions are assigned via tiebreakers but every team
 * has played=0. The bracket engine treats this as "no results yet" and keeps
 * all R32 slots as undefined → UI shows Hebrew placeholder labels.
 */
const unplayedStandings: GroupStanding[] = calculateAllGroupStandings(GROUPS, []);

/**
 * "Full" standings: all mock matches played; real winners and runners-up are known.
 */
const fullStandings: GroupStanding[] = calculateAllGroupStandings(GROUPS, MOCK_MATCHES);

function getMatch(matches: KnockoutMatch[], id: string): KnockoutMatch {
  const m = matches.find((x) => x.id === id);
  if (!m) throw new Error(`Match ${id} not found`);
  return m;
}

// ─── 1. slotLabelHebrew ───────────────────────────────────────────────────────

describe("slotLabelHebrew", () => {
  it("translates 1st-place winner slots", () => {
    expect(slotLabelHebrew("1A")).toBe("מנצחת בית A");
    expect(slotLabelHebrew("1L")).toBe("מנצחת בית L");
  });

  it("translates runner-up slots", () => {
    expect(slotLabelHebrew("2B")).toBe("מקום שני בית B");
    expect(slotLabelHebrew("2K")).toBe("מקום שני בית K");
  });

  it("translates 3rd-place combination slots", () => {
    expect(slotLabelHebrew("3A/B/C/D/F")).toBe("מקום שלישי (A/B/C/D/F)");
    expect(slotLabelHebrew("3C/D/F/G/H")).toBe("מקום שלישי (C/D/F/G/H)");
    expect(slotLabelHebrew("3D/E/I/J/L")).toBe("מקום שלישי (D/E/I/J/L)");
  });

  it("returns the raw string for unknown formats", () => {
    expect(slotLabelHebrew("—")).toBe("—");
  });
});

// ─── 2. resolveBracketSlotLabel ───────────────────────────────────────────────

describe("resolveBracketSlotLabel", () => {
  it("returns Hebrew placeholder when standings are truly empty ([])", () => {
    expect(resolveBracketSlotLabel("1A", [])).toBe("מנצחת בית A");
    expect(resolveBracketSlotLabel("2B", [])).toBe("מקום שני בית B");
    expect(resolveBracketSlotLabel("3A/B/C/D/F", [])).toBe("מקום שלישי (A/B/C/D/F)");
  });

  it("returns Hebrew placeholder when no matches have been played (played=0)", () => {
    // unplayedStandings has teams with played=0 — treated the same as unknown
    expect(resolveBracketSlotLabel("1A", unplayedStandings)).toBe("מנצחת בית A");
    expect(resolveBracketSlotLabel("2B", unplayedStandings)).toBe("מקום שני בית B");
  });

  it("returns the real team name for 1st-place slot when group has played matches", () => {
    const winner = fullStandings.find((s) => s.groupId === "A" && s.position === 1);
    expect(winner).toBeDefined();
    const label = resolveBracketSlotLabel("1A", fullStandings);
    expect(label).toBe(winner!.team.name);
  });

  it("returns the real team name for runner-up slot when group has played matches", () => {
    const runnerUp = fullStandings.find((s) => s.groupId === "F" && s.position === 2);
    expect(runnerUp).toBeDefined();
    const label = resolveBracketSlotLabel("2F", fullStandings);
    expect(label).toBe(runnerUp!.team.name);
  });
});

// ─── 3. Pre-tournament bracket: all slots are placeholders ───────────────────

describe("buildWC2026KnockoutBracket – pre-tournament (no matches played)", () => {
  const bracket = buildWC2026KnockoutBracket(unplayedStandings);

  it("produces 31 matches", () => {
    expect(bracket).toHaveLength(31);
  });

  it("produces 16 Round-of-32 matches", () => {
    expect(bracket.filter((m) => m.stage === "Round of 32")).toHaveLength(16);
  });

  it("produces 8 Round-of-16 matches", () => {
    expect(bracket.filter((m) => m.stage === "Round of 16")).toHaveLength(8);
  });

  it("produces 4 Quarterfinals, 2 Semifinals, 1 Final", () => {
    expect(bracket.filter((m) => m.stage === "Quarterfinal")).toHaveLength(4);
    expect(bracket.filter((m) => m.stage === "Semifinal")).toHaveLength(2);
    expect(bracket.filter((m) => m.stage === "Final")).toHaveLength(1);
  });

  it("all R32 teams are undefined (played=0 → placeholder mode)", () => {
    const r32 = bracket.filter((m) => m.stage === "Round of 32");
    for (const m of r32) {
      expect(m.homeTeam).toBeUndefined();
      expect(m.awayTeam).toBeUndefined();
    }
  });

  it("every R32 match has homeSlot and awaySlot populated", () => {
    const r32 = bracket.filter((m) => m.stage === "Round of 32");
    for (const m of r32) {
      expect(m.homeSlot).toBeTruthy();
      expect(m.awaySlot).toBeTruthy();
    }
  });

  it("slot strings match the real OpenFootball pairings", () => {
    expect(getMatch(bracket, "r32_1").homeSlot).toBe("2A");
    expect(getMatch(bracket, "r32_1").awaySlot).toBe("2B");
    expect(getMatch(bracket, "r32_2").homeSlot).toBe("1E");
    expect(getMatch(bracket, "r32_2").awaySlot).toBe("3A/B/C/D/F");
    expect(getMatch(bracket, "r32_7").homeSlot).toBe("1A");
    expect(getMatch(bracket, "r32_7").awaySlot).toBe("3C/E/F/H/I");
    expect(getMatch(bracket, "r32_16").homeSlot).toBe("2D");
    expect(getMatch(bracket, "r32_16").awaySlot).toBe("2G");
  });

  it("R16/QF/SF/Final matches have no slot labels", () => {
    const later = bracket.filter((m) => m.stage !== "Round of 32");
    for (const m of later) {
      expect(m.homeSlot).toBeUndefined();
      expect(m.awaySlot).toBeUndefined();
    }
  });
});

// ─── 4. Real bracket topology matches OpenFootball source ────────────────────

describe("buildWC2026KnockoutBracket – bracket topology", () => {
  const bracket = buildWC2026KnockoutBracket(unplayedStandings);

  it("r32_2 (OF#74: 1E) → r16_1 home", () => {
    const m = getMatch(bracket, "r32_2");
    expect(m.nextMatchId).toBe("r16_1");
    expect(m.nextSlot).toBe("home");
  });

  it("r32_5 (OF#77: 1I) → r16_1 away", () => {
    const m = getMatch(bracket, "r32_5");
    expect(m.nextMatchId).toBe("r16_1");
    expect(m.nextSlot).toBe("away");
  });

  it("r32_4 (OF#76: 1C) → r16_3 home", () => {
    const m = getMatch(bracket, "r32_4");
    expect(m.nextMatchId).toBe("r16_3");
    expect(m.nextSlot).toBe("home");
  });

  it("r32_6 (OF#78: 2E) → r16_3 away", () => {
    const m = getMatch(bracket, "r32_6");
    expect(m.nextMatchId).toBe("r16_3");
    expect(m.nextSlot).toBe("away");
  });

  it("r16_1 and r16_2 both feed qf_1", () => {
    expect(getMatch(bracket, "r16_1").nextMatchId).toBe("qf_1");
    expect(getMatch(bracket, "r16_1").nextSlot).toBe("home");
    expect(getMatch(bracket, "r16_2").nextMatchId).toBe("qf_1");
    expect(getMatch(bracket, "r16_2").nextSlot).toBe("away");
  });

  it("r16_3 and r16_4 both feed qf_3", () => {
    expect(getMatch(bracket, "r16_3").nextMatchId).toBe("qf_3");
    expect(getMatch(bracket, "r16_4").nextMatchId).toBe("qf_3");
  });

  it("qf_1 and qf_2 both feed sf_1", () => {
    expect(getMatch(bracket, "qf_1").nextMatchId).toBe("sf_1");
    expect(getMatch(bracket, "qf_2").nextMatchId).toBe("sf_1");
  });

  it("qf_3 and qf_4 both feed sf_2", () => {
    expect(getMatch(bracket, "qf_3").nextMatchId).toBe("sf_2");
    expect(getMatch(bracket, "qf_4").nextMatchId).toBe("sf_2");
  });

  it("sf_1 and sf_2 both feed final", () => {
    expect(getMatch(bracket, "sf_1").nextMatchId).toBe("final");
    expect(getMatch(bracket, "sf_2").nextMatchId).toBe("final");
  });

  it("final has no nextMatchId", () => {
    expect(getMatch(bracket, "final").nextMatchId).toBeUndefined();
  });

  it("r32_16 (2D vs 2G) → r16_7 away", () => {
    const m = getMatch(bracket, "r32_16");
    expect(m.homeSlot).toBe("2D");
    expect(m.awaySlot).toBe("2G");
    expect(m.nextMatchId).toBe("r16_7");
    expect(m.nextSlot).toBe("away");
  });
});

// ─── 5. Post-group-stage: real teams replace placeholders ────────────────────

describe("buildWC2026KnockoutBracket – with full standings (mock data played)", () => {
  const bracket = buildWC2026KnockoutBracket(fullStandings);

  it("r32_7 home = Group A winner (slot 1A)", () => {
    const r32_7 = getMatch(bracket, "r32_7");
    const groupA1 = fullStandings.find((s) => s.groupId === "A" && s.position === 1);
    expect(groupA1).toBeDefined();
    expect(r32_7.homeTeam?.teamId).toBe(groupA1!.teamId);
  });

  it("r32_1 home = Group A runner-up (slot 2A)", () => {
    const r32_1 = getMatch(bracket, "r32_1");
    const groupA2 = fullStandings.find((s) => s.groupId === "A" && s.position === 2);
    expect(groupA2).toBeDefined();
    expect(r32_1.homeTeam?.teamId).toBe(groupA2!.teamId);
  });

  it("slot strings are preserved even after team resolution", () => {
    const r32_2 = getMatch(bracket, "r32_2");
    expect(r32_2.homeSlot).toBe("1E");
    expect(r32_2.homeTeam).toBeDefined();
    expect(r32_2.homeTeam?.fromGroup).toBe("E");
  });

  it("all 1st/2nd-place R32 slots are resolved to real teams", () => {
    for (const m of bracket.filter((x) => x.stage === "Round of 32")) {
      if (m.homeSlot && !m.homeSlot.startsWith("3")) {
        expect(m.homeTeam).toBeDefined();
      }
      if (m.awaySlot && !m.awaySlot.startsWith("3")) {
        expect(m.awayTeam).toBeDefined();
      }
    }
  });
});

// ─── 6. Feeder labels for Round of 16 ────────────────────────────────────────

describe("feeder labels – R16 slot sources have correct slot strings", () => {
  const bracket = buildWC2026KnockoutBracket(unplayedStandings);

  it("r32_2 (feeds r16_1 home) has slot 1E → label 'מנצחת בית E'", () => {
    const r32_2 = getMatch(bracket, "r32_2");
    expect(r32_2.nextMatchId).toBe("r16_1");
    expect(r32_2.nextSlot).toBe("home");
    expect(slotLabelHebrew(r32_2.homeSlot!)).toBe("מנצחת בית E");
  });

  it("r32_5 (feeds r16_1 away) has slot 1I → label 'מנצחת בית I'", () => {
    const r32_5 = getMatch(bracket, "r32_5");
    expect(r32_5.nextMatchId).toBe("r16_1");
    expect(r32_5.nextSlot).toBe("away");
    expect(slotLabelHebrew(r32_5.homeSlot!)).toBe("מנצחת בית I");
  });

  it("r32_3 (feeds r16_2 away) has slot 1F → label 'מנצחת בית F'", () => {
    const r32_3 = getMatch(bracket, "r32_3");
    expect(r32_3.nextMatchId).toBe("r16_2");
    expect(r32_3.homeSlot).toBe("1F");
    expect(slotLabelHebrew("1F")).toBe("מנצחת בית F");
  });
});

// ─── 7. Scenario update: user changes propagate through bracket ───────────────

describe("advanceWinner – scenario update", () => {
  it("advancing a winner from R32 populates the R16 slot", () => {
    const bracket = buildWC2026KnockoutBracket(fullStandings);
    const r32_1 = getMatch(bracket, "r32_1");
    expect(r32_1.homeTeam).toBeDefined();

    const winnerId = r32_1.homeTeam!.teamId;
    const updated = advanceWinner("r32_1", winnerId, bracket);

    expect(getMatch(updated, "r32_1").winner).toBe(winnerId);
    expect(getMatch(updated, "r32_1").status).toBe("played");

    // r32_1 → r16_2 home
    const r16_2 = getMatch(updated, "r16_2");
    expect(r16_2.homeTeam?.teamId).toBe(winnerId);
  });

  it("changing group result changes which team appears in the bracket", () => {
    const flipped = fullStandings.map((s) => {
      if (s.groupId !== "C") return s;
      if (s.position === 1) return { ...s, position: 2 as const };
      if (s.position === 2) return { ...s, position: 1 as const };
      return s;
    });

    const original = buildWC2026KnockoutBracket(fullStandings);
    const modified  = buildWC2026KnockoutBracket(flipped);

    // r32_4 = slot 1C; team should differ after flip
    const orig1C = getMatch(original, "r32_4").homeTeam?.teamId;
    const flip1C = getMatch(modified,  "r32_4").homeTeam?.teamId;
    expect(orig1C).toBeDefined();
    expect(flip1C).toBeDefined();
    expect(orig1C).not.toBe(flip1C);
  });
});

// ─── 8. Road To Final contract (what the tree component relies on) ─────────────
//
// TeamRow uses:
//   • match.homeSlot / awaySlot  → slotLabelHebrew()  (R32 only)
//   • match.homeTeam / awayTeam  → real team name (any stage once known)
//   • no homeSlot on R16+        → shows silent "—" placeholder

describe("Road To Final – contract tests for tree card rendering", () => {
  const pre  = buildWC2026KnockoutBracket(unplayedStandings);  // pre-tournament
  const post = buildWC2026KnockoutBracket(fullStandings);       // after group stage

  it("R32 cards have homeSlot/awaySlot so the tree can show slot labels", () => {
    const r32 = pre.filter((m) => m.stage === "Round of 32");
    expect(r32).toHaveLength(16);
    for (const m of r32) {
      expect(typeof m.homeSlot).toBe("string");
      expect(typeof m.awaySlot).toBe("string");
    }
  });

  it("R32 slot labels are non-empty Hebrew strings", () => {
    for (const m of pre.filter((x) => x.stage === "Round of 32")) {
      expect(slotLabelHebrew(m.homeSlot!).length).toBeGreaterThan(0);
      expect(slotLabelHebrew(m.awaySlot!).length).toBeGreaterThan(0);
      // Must not be the raw slot code
      expect(slotLabelHebrew(m.homeSlot!)).not.toBe(m.homeSlot);
    }
  });

  it("R16+ matches have NO homeSlot/awaySlot (tree shows silent placeholder)", () => {
    const later = pre.filter((m) => m.stage !== "Round of 32");
    for (const m of later) {
      expect(m.homeSlot).toBeUndefined();
      expect(m.awaySlot).toBeUndefined();
    }
  });

  it("R32 pre-tournament: homeTeam undefined → tree shows slot label", () => {
    const r32 = pre.filter((m) => m.stage === "Round of 32");
    for (const m of r32) {
      expect(m.homeTeam).toBeUndefined();
      expect(m.awayTeam).toBeUndefined();
    }
  });

  it("R32 post-group-stage: homeTeam defined for 1st/2nd slots → tree shows team name", () => {
    const r32 = post.filter((m) => m.stage === "Round of 32");
    for (const m of r32) {
      if (m.homeSlot && !m.homeSlot.startsWith("3")) {
        expect(m.homeTeam).toBeDefined();
        expect(typeof m.homeTeam?.team.name).toBe("string");
      }
    }
  });

  it("specific slot labels match expected Hebrew text", () => {
    // r32_3: 1F vs 2C
    const r32_3 = getMatch(pre, "r32_3");
    expect(slotLabelHebrew(r32_3.homeSlot!)).toBe("מנצחת בית F");
    expect(slotLabelHebrew(r32_3.awaySlot!)).toBe("מקום שני בית C");

    // r32_1: 2A vs 2B
    const r32_1 = getMatch(pre, "r32_1");
    expect(slotLabelHebrew(r32_1.homeSlot!)).toBe("מקום שני בית A");
    expect(slotLabelHebrew(r32_1.awaySlot!)).toBe("מקום שני בית B");
  });

  it("after group results R32 team name replaces slot label (Mexico example)", () => {
    // r32_3 home = slot 1F = Group F winner (likely MEX in mock data)
    const r32_3 = getMatch(post, "r32_3");
    expect(r32_3.homeTeam).toBeDefined();
    const groupF1 = fullStandings.find((s) => s.groupId === "F" && s.position === 1);
    expect(r32_3.homeTeam?.teamId).toBe(groupF1?.teamId);
  });
});
