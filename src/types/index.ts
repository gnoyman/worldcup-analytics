// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  strengthRating: number; // 1-100
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
}

// ─── Match Data ───────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: "unplayed" | "played";
  matchDay: number;
  date: string;
  /** Kickoff time in HH:mm format (24h), provider-dependent. */
  time?: string;
  /** Venue / stadium name, when provided by the data source. */
  venue?: string;
  /**
   * FDO stage string, preserved verbatim from the API.
   * Group stage: "GROUP_STAGE"
   * Knockout:    "LAST_32" | "LAST_16" | "QUARTER_FINALS" | "SEMI_FINALS" | "THIRD_PLACE" | "FINAL"
   * Absent on mock data and OpenFootball matches.
   */
  stage?: string;
  /**
   * Knockout matches that end level after full-time (ET/penalties).
   * FDO's score.winner field indicates the actual winner.
   * "home" → homeTeamId won; "away" → awayTeamId won.
   * Absent on group-stage matches and knockout matches decided in regulation.
   */
  knockoutWinner?: "home" | "away";
}

// ─── Group Stage ──────────────────────────────────────────────────────────────

export interface GroupStanding {
  teamId: string;
  team: Team;
  groupId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number; // 1-4
}

export interface HeadToHeadRecord {
  points: number;
  goalDifference: number;
  goalsFor: number;
}

// ─── Knockout ─────────────────────────────────────────────────────────────────

export type KnockoutStage =
  | "Round of 32"
  | "Round of 16"
  | "Quarterfinal"
  | "Semifinal"
  | "Final";

export const KNOCKOUT_STAGE_ORDER: KnockoutStage[] = [
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Final",
];

export interface KnockoutTeam {
  teamId: string;
  team: Team;
  fromGroup: string;
  position: "1st" | "2nd" | "3rd";
  seeding: number;
}

export interface KnockoutMatch {
  id: string;
  stage: KnockoutStage;
  homeTeam?: KnockoutTeam;
  awayTeam?: KnockoutTeam;
  homeScore?: number;
  awayScore?: number;
  winner?: string; // teamId
  status: "scheduled" | "played";
  date?: string;
  // bracket tree links
  nextMatchId?: string;
  nextSlot?: "home" | "away";
  /**
   * Slot-label strings (e.g. "1A", "2B", "3A/B/C/D/F") for R32 matches
   * before teams are resolved from standings. Populated by the knockout
   * engine; consumed by BracketPage to show Hebrew placeholder labels.
   */
  homeSlot?: string;
  awaySlot?: string;
}

export interface KnockoutBracket {
  matches: KnockoutMatch[];
  stage: string;
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export interface SimulationScenario {
  id: string;
  name: string;
  timestamp: number;
  matches: Match[];
  calculatedStandings: GroupStanding[];
  qualifiers: GroupStanding[];
  thirdPlaceRankings: GroupStanding[];
}

export interface TournamentState {
  groups: Group[];
  matches: Match[];
  standings: GroupStanding[];
  projectedQualifiers: GroupStanding[]; // 1st and 2nd place in each group
  thirdPlaceTeams: GroupStanding[];
  knockoutBracket: KnockoutBracket;
}

// ─── Monte Carlo ─────────────────────────────────────────────────────────────

export interface MCTeamResult {
  teamId: string;
  // Group-stage finish probabilities
  qualifyFromGroup: number;
  finishFirst: number;
  finishSecond: number;
  finishThirdQualify: number;
  // Knockout stage reach probabilities
  reachRound32: number;     // same as qualifyFromGroup
  reachRound16: number;
  reachQuarterfinal: number;
  reachSemifinal: number;
  reachFinal: number;
  winTournament: number;
}

export interface MonteCarloResult {
  iterations: number;
  teams: MCTeamResult[];
  computedAt: number;
  durationMs: number;
}

// ─── Probability ──────────────────────────────────────────────────────────────

export interface TeamProbabilities {
  teamId: string;
  team: Team;
  qualifyFromGroup: number;
  finishFirst: number;
  finishSecond: number;
  finishThird: number;
  reachRound16: number;
  reachQuarterfinal: number;
  reachSemifinal: number;
  reachFinal: number;
  winTournament: number;
}

// ─── Matchup Analysis ─────────────────────────────────────────────────────────

export interface MatchupAnalysis {
  teamA: Team;
  teamB: Team;
  sameGroup: boolean;
  groupStageMatchId?: string;
  canMeetInKnockout: boolean;
  earliestKnockoutStage: KnockoutStage | null;
  latestKnockoutStage: KnockoutStage | null;
  projectedMeetingStage: KnockoutStage | null;
  meetingProbability: number; // 0-1 deterministic estimate
  pathConditions: {
    forTeamA: string[];
    forTeamB: string[];
  };
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface NavTab {
  id: string;
  label: string;
  icon: string;
}

export interface AppState {
  currentTab: string;
  tournament: TournamentState;
  scenario?: SimulationScenario;
  selectedTeamForPath?: string;
  selectedTeamForMatchup?: string;
}
