"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from "react";
import {
  TournamentState, Match, SimulationScenario, MonteCarloResult,
  GroupStanding, Team, Group,
} from "@/types";
import {
  calculateAllGroupStandings,
  getQualifiedTeams,
  getTopEightThirdPlaceTeams,
} from "@/engine/standings/standings";
import { buildWC2026KnockoutBracket } from "@/engine/knockout/knockout";
import { runMonteCarlo, DEFAULT_ITERATIONS } from "@/engine/monteCarlo/monteCarlo";
import { GROUPS, MOCK_MATCHES } from "@/data/mockData";

// ── Data source type ─────────────────────────────────────────────────────────

export type DataSource = "loading" | "live" | "mock" | "openfootball" | "error";

// ── Context shape ────────────────────────────────────────────────────────────

interface AppContextType {
  tournament: TournamentState;
  scenario: SimulationScenario | null;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number) => void;
  resetToMockData: () => void;
  getCurrentMatches: () => Match[];
  mcResult: MonteCarloResult | null;
  mcLoading: boolean;
  // API integration
  dataSource: DataSource;
  /** Recent/today matches from last sync (no live polling). */
  liveMatches: Match[];
  /** Standings from the API provider; null when unavailable or in mock mode. */
  apiStandings: GroupStanding[] | null;
  /** Union of all known teams across active groups. */
  teamsById: Map<string, Team>;
  /** True after an HTTP 429 is received. All automatic API calls stop for the session. */
  rateLimited: boolean;
  /** Manual sync state. */
  syncInProgress: boolean;
  lastSyncAt: number | null;
  syncError: string | null;
  manualSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildTournamentState(matches: Match[], groups: Group[]): TournamentState {
  const standings       = calculateAllGroupStandings(groups, matches);
  const qualified       = getQualifiedTeams(standings);
  const thirdPlaceTeams = getTopEightThirdPlaceTeams(standings);
  const knockoutMatches = buildWC2026KnockoutBracket(standings);

  return {
    groups,
    matches,
    standings,
    projectedQualifiers: qualified,
    thirdPlaceTeams,
    knockoutBracket: { matches: knockoutMatches, stage: "Round of 32" },
  };
}

function matchStateKey(matches: Match[]): string {
  return matches
    .filter(m => m.status === "played")
    .map(m => `${m.id}:${m.homeScore}-${m.awayScore}`)
    .join(",");
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tournament,     setTournament]     = useState<TournamentState>(() => buildTournamentState(MOCK_MATCHES, GROUPS));
  const [activeGroups,   setActiveGroups]   = useState<Group[]>(GROUPS);
  const [scenario,       setScenario]       = useState<SimulationScenario | null>(null);
  const [selectedTab,    setSelectedTab]    = useState("live");
  const [mcResult,       setMcResult]       = useState<MonteCarloResult | null>(null);
  const [mcLoading,      setMcLoading]      = useState(true);
  const [dataSource,     setDataSource]     = useState<DataSource>("loading");
  const [liveMatches,    setLiveMatches]    = useState<Match[]>([]);
  const [apiStandings,   setApiStandings]   = useState<GroupStanding[] | null>(null);
  const [rateLimited,    setRateLimited]    = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncAt,     setLastSyncAt]     = useState<number | null>(null);
  const [syncError,      setSyncError]      = useState<string | null>(null);

  // ── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    if (USE_MOCK) {
      setDataSource("mock");
      return;
    }

    async function loadApiData() {
      try {
        const [groupsRes, fixturesRes, standingsRes] = await Promise.all([
          fetch("/api/football/groups"),
          fetch("/api/football/fixtures"),
          fetch("/api/football/standings"),
        ]);

        const [groupsJson, fixturesJson, standingsJson] = await Promise.all([
          groupsRes.json()   as Promise<{ ok: boolean; data: Group[] | null }>,
          fixturesRes.json() as Promise<{ ok: boolean; data: Match[];    rateLimited?: boolean }>,
          standingsRes.json() as Promise<{ ok: boolean; data: GroupStanding[]; rateLimited?: boolean }>,
        ]);

        if (fixturesJson.rateLimited || standingsJson.rateLimited) {
          setRateLimited(true);
          setDataSource("mock");
          return;
        }

        // Use real groups when the provider supplies them (OpenFootball)
        const groups = (groupsJson.ok && Array.isArray(groupsJson.data) && groupsJson.data.length > 0)
          ? groupsJson.data
          : GROUPS;
        setActiveGroups(groups);

        if (fixturesJson.ok && Array.isArray(fixturesJson.data)) {
          const fixtures = fixturesJson.data;
          const hasInternalIds =
            fixtures.length > 0 &&
            fixtures.every(f => !f.homeTeamId.startsWith("apif_"));

          if (hasInternalIds) {
            setTournament(buildTournamentState(fixtures, groups));
          }

          const today = todayStr();
          const todayMatches = fixtures.filter(m => m.date?.startsWith(today));
          if (todayMatches.length > 0) setLiveMatches(todayMatches);
        }

        if (standingsJson.ok && Array.isArray(standingsJson.data) && standingsJson.data.length > 0) {
          setApiStandings(standingsJson.data);
        }

        // If groups came from OpenFootball, mark source accordingly
        const providerIsOpenFootball = groupsJson.ok && Array.isArray(groupsJson.data) && groupsJson.data.length > 0;
        setDataSource(providerIsOpenFootball ? "openfootball" : "live");
        setLastSyncAt(Date.now());
      } catch (err) {
        console.error("[AppContext] API data load failed:", err);
        setDataSource("error");
      }
    }

    loadApiData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual sync ──────────────────────────────────────────────────────────
  const manualSync = useCallback(async () => {
    if (syncInProgress || rateLimited) return;

    setSyncInProgress(true);
    setSyncError(null);

    try {
      const [syncRes, groupsRes] = await Promise.all([
        fetch("/api/football/sync", { method: "POST" }),
        fetch("/api/football/groups"),
      ]);

      const [syncJson, groupsJson] = await Promise.all([
        syncRes.json() as Promise<{
          ok: boolean; rateLimited?: boolean; error?: string;
          data?: { fixtures: Match[]; standings: GroupStanding[]; topScorers: unknown[]; syncedAt: number; errors?: string[] };
        }>,
        groupsRes.json() as Promise<{ ok: boolean; data: Group[] | null }>,
      ]);

      if (syncJson.rateLimited) {
        setRateLimited(true);
        setSyncError("מכסת API יומית נוצלה. מוצגים נתונים שמורים/מוקאפ.");
        setDataSource("mock");
        return;
      }

      if (!syncJson.ok) {
        setSyncError(syncJson.error ?? "Sync failed");
        return;
      }

      // Update groups if provided
      const groups = (groupsJson.ok && Array.isArray(groupsJson.data) && groupsJson.data.length > 0)
        ? groupsJson.data
        : activeGroups;
      setActiveGroups(groups);

      if (syncJson.data) {
        const { fixtures, standings, syncedAt } = syncJson.data;

        if (fixtures.length > 0) {
          const hasInternalIds = fixtures.every(f => !f.homeTeamId.startsWith("apif_"));
          if (hasInternalIds) setTournament(buildTournamentState(fixtures, groups));
        }

        if (standings.length > 0) setApiStandings(standings);

        const today = todayStr();
        setLiveMatches(fixtures.filter(m => m.date?.startsWith(today)));

        setLastSyncAt(syncedAt);
        const providerIsOpenFootball = groupsJson.ok && Array.isArray(groupsJson.data) && groupsJson.data.length > 0;
        setDataSource(providerIsOpenFootball ? "openfootball" : "live");

        if (syncJson.data.errors?.length) {
          setSyncError(syncJson.data.errors.join(" | "));
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Network error during sync");
    } finally {
      setSyncInProgress(false);
    }
  }, [syncInProgress, rateLimited, activeGroups]);

  // ── teamsById ────────────────────────────────────────────────────────────
  const teamsById = useMemo<Map<string, Team>>(() => {
    const map = new Map<string, Team>();
    activeGroups.forEach(g => g.teams.forEach(t => map.set(t.id, t)));
    apiStandings?.forEach(s => { if (!map.has(s.teamId)) map.set(s.teamId, s.team); });
    return map;
  }, [apiStandings, activeGroups]);

  // ── Monte Carlo ──────────────────────────────────────────────────────────
  const stateKey = useMemo(
    () => matchStateKey(tournament.matches) + "|" + activeGroups.map(g => g.id).join(","),
    [tournament.matches, activeGroups]
  );

  useEffect(() => {
    setMcLoading(true);
    setMcResult(null);
    const id = setTimeout(() => {
      setMcResult(runMonteCarlo(activeGroups, tournament.matches, DEFAULT_ITERATIONS));
      setMcLoading(false);
    }, 30);
    return () => clearTimeout(id);
  }, [stateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Match-result helpers ─────────────────────────────────────────────────
  const getCurrentMatches = useCallback(
    () => scenario?.matches ?? tournament.matches,
    [scenario, tournament.matches]
  );

  const updateMatchScore = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      const current = getCurrentMatches();
      const updated = current.map(m =>
        m.id === matchId ? { ...m, homeScore, awayScore, status: "played" as const } : m
      );
      const newState = buildTournamentState(updated, activeGroups);
      setScenario({
        id:                  `scenario_${Date.now()}`,
        name:                "עריכה נוכחית",
        timestamp:           Date.now(),
        matches:             updated,
        calculatedStandings: newState.standings,
        qualifiers:          newState.projectedQualifiers,
        thirdPlaceRankings:  newState.thirdPlaceTeams,
      });
      setTournament(newState);
    },
    [getCurrentMatches, activeGroups]
  );

  const resetToMockData = useCallback(() => {
    setScenario(null);
    setActiveGroups(GROUPS);
    setTournament(buildTournamentState(MOCK_MATCHES, GROUPS));
  }, []);

  return (
    <AppContext.Provider
      value={{
        tournament,
        scenario,
        selectedTab,
        setSelectedTab,
        updateMatchScore,
        resetToMockData,
        getCurrentMatches,
        mcResult,
        mcLoading,
        dataSource,
        liveMatches,
        apiStandings,
        teamsById,
        rateLimited,
        syncInProgress,
        lastSyncAt,
        syncError,
        manualSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
