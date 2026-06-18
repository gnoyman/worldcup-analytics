import { GroupStanding, KnockoutMatch, KnockoutTeam, KnockoutStage, Match } from "@/types";
import { getTopEightThirdPlaceTeams } from "@/engine/standings/standings";

// ─── WC 2026 Real Bracket ──────────────────────────────────────────────────────
//
// Source: openfootball/worldcup.json — matches 73–104.
// The 16 Round-of-32 pairings do NOT follow a simple "1A vs 2B" mirror pattern.
// Several matches pair two runners-up (2A vs 2B, 2E vs 2I, etc.), and the
// eight third-place slots each specify which group combination may fill them.
//
// Slot notation used by OpenFootball:
//   "1A"           → Winner of Group A
//   "2B"           → Runner-up of Group B
//   "3A/B/C/D/F"   → Best 3rd-place team from any of those groups
//
// R32 → R16 routing (match-num reference from OpenFootball):
//   r32_1  (73):  2A  vs  2B          → r16_2 home
//   r32_2  (74):  1E  vs  3A/B/C/D/F  → r16_1 home
//   r32_3  (75):  1F  vs  2C          → r16_2 away
//   r32_4  (76):  1C  vs  2F          → r16_3 home
//   r32_5  (77):  1I  vs  3C/D/F/G/H  → r16_1 away
//   r32_6  (78):  2E  vs  2I          → r16_3 away
//   r32_7  (79):  1A  vs  3C/E/F/H/I  → r16_4 home
//   r32_8  (80):  1L  vs  3E/H/I/J/K  → r16_4 away
//   r32_9  (81):  1D  vs  3B/E/F/I/J  → r16_6 home
//   r32_10 (82):  1G  vs  3A/E/H/I/J  → r16_6 away
//   r32_11 (83):  2K  vs  2L          → r16_5 home
//   r32_12 (84):  1H  vs  2J          → r16_5 away
//   r32_13 (85):  1B  vs  3E/F/G/I/J  → r16_8 home
//   r32_14 (86):  1J  vs  2H          → r16_7 home
//   r32_15 (87):  1K  vs  3D/E/I/J/L  → r16_8 away
//   r32_16 (88):  2D  vs  2G          → r16_7 away
//
// R16 → QF: r16_1/2→qf_1, r16_3/4→qf_3, r16_5/6→qf_2, r16_7/8→qf_4
// QF  → SF: qf_1/2→sf_1, qf_3/4→sf_2
// SF  → Final: sf_1/2→final

// ─── Slot label helpers ───────────────────────────────────────────────────────

/**
 * Convert an OpenFootball slot string into a Hebrew display label.
 *
 *   "1A"           → "מנצחת בית A"
 *   "2B"           → "מקום שני בית B"
 *   "3A/B/C/D/F"   → "מקום שלישי (A/B/C/D/F)"
 */
export function slotLabelHebrew(slot: string): string {
  if (!slot) return "—";
  const m1 = /^1([A-L])$/.exec(slot);
  if (m1) return `מנצחת בית ${m1[1]}`;
  const m2 = /^2([A-L])$/.exec(slot);
  if (m2) return `מקום שני בית ${m2[1]}`;
  if (slot.startsWith("3")) {
    const groups = slot.slice(1); // "A/B/C/D/F"
    return `מקום שלישי (${groups})`;
  }
  return slot;
}

/**
 * Resolve a slot string to a team name given current standings.
 * Returns the team name when the group stage has determined it,
 * or the Hebrew slot label when it is not yet known.
 *
 * @param slot       e.g. "1A", "2B", "3A/B/C/D/F"
 * @param standings  current group-stage standings
 */
export function resolveBracketSlotLabel(
  slot: string,
  standings: GroupStanding[]
): string {
  const byGroup: Record<string, Record<number, GroupStanding>> = {};
  for (const s of standings) {
    if (!byGroup[s.groupId]) byGroup[s.groupId] = {};
    byGroup[s.groupId][s.position] = s;
  }
  const top8Third = getTopEightThirdPlaceTeams(standings);

  const m1 = /^1([A-L])$/.exec(slot);
  if (m1) {
    const s = byGroup[m1[1]]?.[1];
    return (s && s.played > 0) ? s.team.name : slotLabelHebrew(slot);
  }

  const m2 = /^2([A-L])$/.exec(slot);
  if (m2) {
    const s = byGroup[m2[1]]?.[2];
    return (s && s.played > 0) ? s.team.name : slotLabelHebrew(slot);
  }

  if (slot.startsWith("3")) {
    const groups = slot.slice(1).split("/");
    const qualifier = top8Third.find((s) => groups.includes(s.groupId) && s.played > 0);
    return qualifier ? qualifier.team.name : slotLabelHebrew(slot);
  }

  return slotLabelHebrew(slot);
}

// ─── Internal builders ────────────────────────────────────────────────────────

function toKT(
  s: GroupStanding | undefined,
  position: "1st" | "2nd" | "3rd",
  seeding: number
): KnockoutTeam | undefined {
  if (!s) return undefined;
  return { teamId: s.teamId, team: s.team, fromGroup: s.groupId, position, seeding };
}

function makeMatch(
  id: string,
  stage: KnockoutStage,
  home: KnockoutTeam | undefined,
  away: KnockoutTeam | undefined,
  homeSlot?: string,
  awaySlot?: string,
  nextMatchId?: string,
  nextSlot?: "home" | "away"
): KnockoutMatch {
  return { id, stage, homeTeam: home, awayTeam: away, homeSlot, awaySlot, status: "scheduled", nextMatchId, nextSlot };
}

/**
 * Resolve a slot string to a KnockoutTeam given indexed standings.
 *
 * Returns undefined when no matches have been played in the relevant group
 * (i.e. all teams have played=0). This keeps the bracket in "placeholder"
 * mode before the tournament starts, so the UI shows Hebrew slot labels
 * rather than an arbitrary ordering from the tiebreaker algorithm.
 *
 * Once any group match is played (or the user enters a hypothetical result),
 * the standing for that group has played>0 and the real team is shown.
 */
function slotToKT(
  slot: string,
  byGroup: Record<string, Record<number, GroupStanding>>,
  top8Third: GroupStanding[],
  seeding: number
): KnockoutTeam | undefined {
  const m1 = /^1([A-L])$/.exec(slot);
  if (m1) {
    const s = byGroup[m1[1]]?.[1];
    if (!s || s.played === 0) return undefined;
    return toKT(s, "1st", seeding);
  }

  const m2 = /^2([A-L])$/.exec(slot);
  if (m2) {
    const s = byGroup[m2[1]]?.[2];
    if (!s || s.played === 0) return undefined;
    return toKT(s, "2nd", seeding);
  }

  if (slot.startsWith("3")) {
    const groups = slot.slice(1).split("/");
    // Only show a 3rd-place team when at least one qualifying group has played
    const qualifier = top8Third.find(
      (s) => groups.includes(s.groupId) && s.played > 0
    );
    if (!qualifier) return undefined;
    const rank = top8Third.indexOf(qualifier);
    return toKT(qualifier, "3rd", rank + 1);
  }

  return undefined;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the complete 31-match WC 2026 knockout bracket from group standings,
 * using the real pairings published by OpenFootball.
 *
 * R32 matches carry `homeSlot` / `awaySlot` with the raw OpenFootball slot
 * string ("1A", "2B", "3A/B/C/D/F"). Teams are resolved from `standings`
 * whenever available; pre-tournament the teams will be `undefined` and the
 * bracket page uses the slot strings for Hebrew placeholder labels.
 *
 * The bracket tree is encoded via `nextMatchId` / `nextSlot` on every match.
 */
export function buildWC2026KnockoutBracket(standings: GroupStanding[]): KnockoutMatch[] {
  // Index standings by group + position
  const byGroup: Record<string, Record<number, GroupStanding>> = {};
  for (const s of standings) {
    if (!byGroup[s.groupId]) byGroup[s.groupId] = {};
    byGroup[s.groupId][s.position] = s;
  }

  const top8Third = getTopEightThirdPlaceTeams(standings);

  const kt = (slot: string, seeding: number) => slotToKT(slot, byGroup, top8Third, seeding);

  const matches: KnockoutMatch[] = [];

  // ── Round of 32 ────────────────────────────────────────────────────────────
  // Each makeMatch: id, stage, homeTeam, awayTeam, homeSlot, awaySlot, nextMatchId, nextSlot
  matches.push(makeMatch("r32_1",  "Round of 32", kt("2A",1),              kt("2B",2),              "2A",             "2B",             "r16_2","home"));
  matches.push(makeMatch("r32_2",  "Round of 32", kt("1E",3),              kt("3A/B/C/D/F",4),      "1E",             "3A/B/C/D/F",     "r16_1","home"));
  matches.push(makeMatch("r32_3",  "Round of 32", kt("1F",5),              kt("2C",6),              "1F",             "2C",             "r16_2","away"));
  matches.push(makeMatch("r32_4",  "Round of 32", kt("1C",7),              kt("2F",8),              "1C",             "2F",             "r16_3","home"));
  matches.push(makeMatch("r32_5",  "Round of 32", kt("1I",9),              kt("3C/D/F/G/H",10),     "1I",             "3C/D/F/G/H",     "r16_1","away"));
  matches.push(makeMatch("r32_6",  "Round of 32", kt("2E",11),             kt("2I",12),             "2E",             "2I",             "r16_3","away"));
  matches.push(makeMatch("r32_7",  "Round of 32", kt("1A",13),             kt("3C/E/F/H/I",14),     "1A",             "3C/E/F/H/I",     "r16_4","home"));
  matches.push(makeMatch("r32_8",  "Round of 32", kt("1L",15),             kt("3E/H/I/J/K",16),     "1L",             "3E/H/I/J/K",     "r16_4","away"));
  matches.push(makeMatch("r32_9",  "Round of 32", kt("1D",17),             kt("3B/E/F/I/J",18),     "1D",             "3B/E/F/I/J",     "r16_6","home"));
  matches.push(makeMatch("r32_10", "Round of 32", kt("1G",19),             kt("3A/E/H/I/J",20),     "1G",             "3A/E/H/I/J",     "r16_6","away"));
  matches.push(makeMatch("r32_11", "Round of 32", kt("2K",21),             kt("2L",22),             "2K",             "2L",             "r16_5","home"));
  matches.push(makeMatch("r32_12", "Round of 32", kt("1H",23),             kt("2J",24),             "1H",             "2J",             "r16_5","away"));
  matches.push(makeMatch("r32_13", "Round of 32", kt("1B",25),             kt("3E/F/G/I/J",26),     "1B",             "3E/F/G/I/J",     "r16_8","home"));
  matches.push(makeMatch("r32_14", "Round of 32", kt("1J",27),             kt("2H",28),             "1J",             "2H",             "r16_7","home"));
  matches.push(makeMatch("r32_15", "Round of 32", kt("1K",29),             kt("3D/E/I/J/L",30),     "1K",             "3D/E/I/J/L",     "r16_8","away"));
  matches.push(makeMatch("r32_16", "Round of 32", kt("2D",31),             kt("2G",32),             "2D",             "2G",             "r16_7","away"));

  // ── Round of 16 ────────────────────────────────────────────────────────────
  // r16_1 (OF#89): W74 vs W77  → qf_1 home
  // r16_2 (OF#90): W73 vs W75  → qf_1 away
  // r16_3 (OF#91): W76 vs W78  → qf_3 home
  // r16_4 (OF#92): W79 vs W80  → qf_3 away
  // r16_5 (OF#93): W83 vs W84  → qf_2 home
  // r16_6 (OF#94): W81 vs W82  → qf_2 away
  // r16_7 (OF#95): W86 vs W88  → qf_4 home
  // r16_8 (OF#96): W85 vs W87  → qf_4 away
  matches.push(makeMatch("r16_1", "Round of 16", undefined, undefined, undefined, undefined, "qf_1","home"));
  matches.push(makeMatch("r16_2", "Round of 16", undefined, undefined, undefined, undefined, "qf_1","away"));
  matches.push(makeMatch("r16_3", "Round of 16", undefined, undefined, undefined, undefined, "qf_3","home"));
  matches.push(makeMatch("r16_4", "Round of 16", undefined, undefined, undefined, undefined, "qf_3","away"));
  matches.push(makeMatch("r16_5", "Round of 16", undefined, undefined, undefined, undefined, "qf_2","home"));
  matches.push(makeMatch("r16_6", "Round of 16", undefined, undefined, undefined, undefined, "qf_2","away"));
  matches.push(makeMatch("r16_7", "Round of 16", undefined, undefined, undefined, undefined, "qf_4","home"));
  matches.push(makeMatch("r16_8", "Round of 16", undefined, undefined, undefined, undefined, "qf_4","away"));

  // ── Quarterfinals ──────────────────────────────────────────────────────────
  // qf_1 (OF#97):  W89/W90  → sf_1 home
  // qf_2 (OF#98):  W93/W94  → sf_1 away
  // qf_3 (OF#99):  W91/W92  → sf_2 home
  // qf_4 (OF#100): W95/W96  → sf_2 away
  matches.push(makeMatch("qf_1", "Quarterfinal", undefined, undefined, undefined, undefined, "sf_1","home"));
  matches.push(makeMatch("qf_2", "Quarterfinal", undefined, undefined, undefined, undefined, "sf_1","away"));
  matches.push(makeMatch("qf_3", "Quarterfinal", undefined, undefined, undefined, undefined, "sf_2","home"));
  matches.push(makeMatch("qf_4", "Quarterfinal", undefined, undefined, undefined, undefined, "sf_2","away"));

  // ── Semifinals ─────────────────────────────────────────────────────────────
  matches.push(makeMatch("sf_1", "Semifinal", undefined, undefined, undefined, undefined, "final","home"));
  matches.push(makeMatch("sf_2", "Semifinal", undefined, undefined, undefined, undefined, "final","away"));

  // ── Final ──────────────────────────────────────────────────────────────────
  matches.push(makeMatch("final", "Final", undefined, undefined));

  return matches;
}

/**
 * Advance the winner of a knockout match into the next match slot.
 * Returns a new matches array (immutable update).
 */
export function advanceWinner(
  matchId: string,
  winnerId: string,
  allMatches: KnockoutMatch[]
): KnockoutMatch[] {
  const source = allMatches.find((m) => m.id === matchId);
  if (!source) return allMatches;

  const winnerTeam =
    source.homeTeam?.teamId === winnerId ? source.homeTeam :
    source.awayTeam?.teamId === winnerId ? source.awayTeam : undefined;

  if (!winnerTeam) return allMatches;

  return allMatches.map((m) => {
    if (m.id === matchId) {
      return { ...m, winner: winnerId, status: "played" as const };
    }
    if (m.id === source.nextMatchId) {
      if (source.nextSlot === "home") return { ...m, homeTeam: winnerTeam };
      if (source.nextSlot === "away") return { ...m, awayTeam: winnerTeam };
    }
    return m;
  });
}

/**
 * Inject official knockout results from the data provider into the internal
 * bracket tree built by buildWC2026KnockoutBracket().
 *
 * For each played KO fixture (groupId === "KO", status === "played", teams known):
 *   1. Find the matching bracket slot by team IDs.
 *   2. Apply score + status.
 *   3. Call advanceWinner() to propagate the winner into the next round.
 *
 * Matches are processed in stage order (R32 → R16 → QF → SF → Final) so that
 * winners are propagated before downstream slots are searched.
 *
 * Silent skips:
 *   - TBD fixtures (homeTeamId/awayTeamId === "tbd")
 *   - THIRD_PLACE fixtures (no bracket slot exists)
 *   - Matches where the slot cannot be found (e.g. data inconsistency)
 *   - Penalties draws without a knockoutWinner field (warns in development)
 */
export function applyKnockoutResults(
  bracket: KnockoutMatch[],
  koFixtures: Match[]
): KnockoutMatch[] {
  const eligible = koFixtures.filter(
    (m) =>
      m.groupId === "KO" &&
      m.status === "played" &&
      m.homeTeamId !== "tbd" &&
      m.awayTeamId !== "tbd" &&
      m.homeScore !== undefined &&
      m.awayScore !== undefined
  );

  if (eligible.length === 0) return bracket;

  const STAGE_ORDER: Record<string, number> = {
    LAST_32:        1,
    LAST_16:        2,
    QUARTER_FINALS: 3,
    SEMI_FINALS:    4,
    THIRD_PLACE:    5,
    FINAL:          6,
  };

  const sorted = [...eligible].sort(
    (a, b) =>
      (STAGE_ORDER[a.stage ?? ""] ?? 9) - (STAGE_ORDER[b.stage ?? ""] ?? 9)
  );

  let current = [...bracket];

  for (const fixture of sorted) {
    // Locate the bracket slot by matching both team IDs (order may differ)
    const slot = current.find(
      (b) =>
        (b.homeTeam?.teamId === fixture.homeTeamId &&
          b.awayTeam?.teamId === fixture.awayTeamId) ||
        (b.homeTeam?.teamId === fixture.awayTeamId &&
          b.awayTeam?.teamId === fixture.homeTeamId)
    );

    if (!slot) continue; // THIRD_PLACE or winner not yet propagated — skip

    // Determine winner; draw on full time means ET/penalties — use knockoutWinner
    let winnerId: string;
    if (fixture.homeScore! > fixture.awayScore!) {
      winnerId = fixture.homeTeamId;
    } else if (fixture.awayScore! > fixture.homeScore!) {
      winnerId = fixture.awayTeamId;
    } else if (fixture.knockoutWinner === "home") {
      winnerId = fixture.homeTeamId;
    } else if (fixture.knockoutWinner === "away") {
      winnerId = fixture.awayTeamId;
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[knockout] Cannot determine winner for fixture ${fixture.id} — equal scores and no knockoutWinner`
        );
      }
      continue;
    }

    // Map FDO home/away onto bracket home/away (the two may be swapped)
    const fdoHomeIsBracketHome = slot.homeTeam?.teamId === fixture.homeTeamId;
    const bHome = fdoHomeIsBracketHome ? fixture.homeScore : fixture.awayScore;
    const bAway = fdoHomeIsBracketHome ? fixture.awayScore : fixture.homeScore;

    current = current.map((b) =>
      b.id !== slot.id
        ? b
        : { ...b, homeScore: bHome, awayScore: bAway, status: "played" as const, winner: winnerId }
    );

    current = advanceWinner(slot.id, winnerId, current);
  }

  return current;
}

/**
 * Return the bracket path (ordered list of match IDs) that a team would
 * travel from their R32 match all the way to the Final.
 */
export function getTeamBracketPath(teamId: string, allMatches: KnockoutMatch[]): string[] {
  const start = allMatches.find(
    (m) =>
      m.stage === "Round of 32" &&
      (m.homeTeam?.teamId === teamId || m.awayTeam?.teamId === teamId)
  );
  if (!start) return [];

  const path: string[] = [start.id];
  let current: KnockoutMatch = start;

  while (current.nextMatchId) {
    const next = allMatches.find((m) => m.id === current.nextMatchId);
    if (!next) break;
    path.push(next.id);
    current = next;
  }

  return path;
}
