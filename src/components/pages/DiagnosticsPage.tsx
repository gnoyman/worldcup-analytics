"use client";

import { useState, useEffect, useCallback } from "react";

// ── Response shape types ──────────────────────────────────────────────────────

interface QuotaInfo {
  rateLimited: boolean;
  limitHitAt: number | null;
  devMode: boolean;
  syncMode: string;
  cacheTtlHours: number;
  allowManualRefresh: boolean;
  lastSyncAt: number | null;
  nextAllowedSync: number | null;
  requestsToday: number;
  dailyResetAt: number;
  lastApiError: string | null;
}

interface ConfigData {
  isMock: boolean;
  hasApiKey: boolean;
  provider: string;
  footballDataProvider: string;
  devMode: boolean | null;
  season: number | null;
  leagueId: number | null;
  idMappingSize: number | null;
  idMappingPopulated: boolean | null;
  syncMode: string;
  cacheTtlHours: number;
  allowManualRefresh: boolean;
  openFootball: {
    sourceUrl:     string;
    lastFetchAt:   number | null;
    supportsLive:  boolean;
    supportsStats: boolean;
  } | null;
}

interface AuthProbeData {
  ok: boolean;
  requestUrl: string;
  headerNameUsed: string;
  apiKeyLength: number;
  apiKeyPrefix: string;
  apiKeySuffix: string;
  httpStatus: number | null;
  hasTokenError: boolean;
  tokenErrorMessage: string | null;
  countriesCount: number;
  durationMs: number;
  error: string | null;
}

interface FixturesData {
  requestUrl: string | null;
  count: number;
  withApifIds: number;
  planRestricted: boolean;
  rateLimited: boolean;
  durationMs: number;
  error: string | null;
}

interface StandingsData {
  entriesCount: number;
  groupsCount: number;
  planRestricted: boolean;
  rateLimited: boolean;
  durationMs: number;
  error: string | null;
}

interface TopScorersData {
  count: number;
  planRestricted: boolean;
  rateLimited: boolean;
  durationMs: number;
  error: string | null;
}

interface LiveData {
  count: number;
  planRestricted: boolean;
  rateLimited: boolean;
  durationMs: number;
  error: string | null;
}

// ── Per-endpoint test state ───────────────────────────────────────────────────

type TestStatus = "idle" | "loading" | "done" | "error";

interface TestState<T> {
  status: TestStatus;
  result: T | null;
  fromCache: boolean;
  lastRun: Date | null;
  fetchError: string | null;
}

function initialTest<T>(): TestState<T> {
  return { status: "idle", result: null, fromCache: false, lastRun: null, fetchError: null };
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: ok ? "#16a34a" : "#dc2626" }}
    />
  );
}

function Row({
  label,
  value,
  mono = false,
  ok,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  ok?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-2.5 px-4"
      style={{ borderBottom: "1px solid #f1f5fb" }}
    >
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold text-[#475569]">{label}</span>
        {sub && <p className="text-[10px] text-[#94a3b8] mt-0.5 leading-tight">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {ok !== undefined && <StatusDot ok={ok} />}
        <span className={`text-xs font-black text-[#0f172a] ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2"
      style={{ background: "#f8faff", borderBottom: "1px solid #e8eef8", borderTop: "1px solid #e8eef8" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest">{title}</span>
      </div>
      {action}
    </div>
  );
}

function TestButton({
  onClick,
  loading,
  lastRun,
  fromCache,
}: {
  onClick: () => void;
  loading: boolean;
  lastRun: Date | null;
  fromCache: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-opacity shrink-0"
      style={{
        background: loading ? "#e8eef8" : "#eff9ff",
        color: loading ? "#94a3b8" : "#0284c7",
        border: "1px solid #bae6fd",
      }}
    >
      {loading ? "⏳" : "▶"}{" "}
      {loading ? "טוען..." : lastRun ? (fromCache ? "מטמון" : "בדוק שוב") : "בדוק"}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="px-4 pb-2 pt-1">
      <p className="text-[10px] font-mono text-[#dc2626] leading-snug bg-[#fff1f2] rounded-lg px-2 py-1.5 border border-[#fca5a5]">
        {message}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DiagnosticsPage() {
  const [config, setConfig]         = useState<ConfigData | null>(null);
  const [quota, setQuota]           = useState<QuotaInfo | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [auth,       setAuth]       = useState<TestState<AuthProbeData>>(initialTest);
  const [fixtures,   setFixtures]   = useState<TestState<FixturesData & { wc2026Unavailable?: boolean }>>(initialTest);
  const [standings,  setStandings]  = useState<TestState<StandingsData & { wc2026Unavailable?: boolean }>>(initialTest);
  const [topScorers, setTopScorers] = useState<TestState<TopScorersData>>(initialTest);
  const [live,       setLive]       = useState<TestState<LiveData>>(initialTest);

  // Load config (no external API calls) on mount
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res  = await fetch("/api/football/diagnostics");
      const json = await res.json() as { ok: boolean; data?: { config: ConfigData; quota: QuotaInfo }; error?: string };
      if (json.ok && json.data) {
        setConfig(json.data.config);
        setQuota(json.data.quota);
      }
    } catch {
      // ignore — config section just stays blank
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Generic endpoint test runner
  async function runTest<T>(
    param: string,
    dataKey: string,
    setState: React.Dispatch<React.SetStateAction<TestState<T>>>,
  ) {
    setState(s => ({ ...s, status: "loading", fetchError: null }));
    try {
      const res  = await fetch(`/api/football/diagnostics?test=${param}`);
      const json = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string };
      if (json.ok && json.data) {
        // Update quota from every response
        if (json.data.quota) setQuota(json.data.quota as QuotaInfo);
        setState({
          status:     "done",
          result:     json.data[dataKey] as T ?? null,
          fromCache:  (json.data.fromCache as boolean) ?? false,
          lastRun:    new Date(),
          fetchError: null,
        });
        // Carry along wc2026Unavailable into the result for fixture/standings
        if (json.data.wc2026Unavailable !== undefined) {
          setState(s => s.result ? {
            ...s,
            result: { ...s.result, wc2026Unavailable: json.data!.wc2026Unavailable as boolean },
          } : s);
        }
      } else {
        setState(s => ({ ...s, status: "error", fetchError: json.error ?? "Unknown error" }));
      }
    } catch (err) {
      setState(s => ({ ...s, status: "error", fetchError: err instanceof Error ? err.message : String(err) }));
    }
  }

  const testAuth       = () => runTest("auth",       "authProbe",  setAuth as React.Dispatch<React.SetStateAction<TestState<AuthProbeData>>>);
  const testFixtures   = () => runTest("fixtures",   "fixtures",   setFixtures as React.Dispatch<React.SetStateAction<TestState<FixturesData & { wc2026Unavailable?: boolean }>>>);
  const testStandings  = () => runTest("standings",  "standings",  setStandings as React.Dispatch<React.SetStateAction<TestState<StandingsData & { wc2026Unavailable?: boolean }>>>);
  const testTopScorers = () => runTest("topscorers", "topScorers", setTopScorers as React.Dispatch<React.SetStateAction<TestState<TopScorersData>>>);
  const testLive       = () => runTest("live",       "liveMatches",setLive as React.Dispatch<React.SetStateAction<TestState<LiveData>>>);

  const isLive = config && !config.isMock;

  return (
    <div className="pb-[80px]">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-6 pb-4"
        style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">דיאגנוסטיקה</h1>
          </div>
          <button
            onClick={loadConfig}
            disabled={configLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold"
            style={{
              background: configLoading ? "#e8eef8" : "#eff9ff",
              color: configLoading ? "#94a3b8" : "#0284c7",
              border: "1px solid #bae6fd",
            }}
          >
            {configLoading ? "⏳" : "🔄"} {configLoading ? "טוען..." : "רענן הגדרות"}
          </button>
        </div>
        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
          API Football · Debug Panel
        </p>
        <div className="title-bar mt-2" />
      </div>

      <div className="pt-4">

        {/* ── Quota protection status ────────────────────────────────────── */}
        {quota && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader title="API Quota Protection" icon="🛡️" />

            <Row
              label="API mode"
              value={quota.syncMode === "daily" ? "Daily sync" : quota.syncMode}
              ok={true}
              sub="API_SYNC_MODE — no automatic polling"
            />
            <Row
              label="Cache TTL"
              value={`${quota.cacheTtlHours} hours`}
              ok={true}
              sub="API_CACHE_TTL_HOURS — responses cached server-side"
            />
            <Row
              label="Manual refresh"
              value={quota.allowManualRefresh ? "Enabled" : "Disabled"}
              ok={quota.allowManualRefresh}
              sub="API_ALLOW_MANUAL_REFRESH"
            />
            <Row
              label="Last sync"
              value={quota.lastSyncAt ? new Date(quota.lastSyncAt).toLocaleTimeString("he-IL") : "Never"}
              ok={quota.lastSyncAt !== null}
              sub="Time of last successful manual sync"
            />
            <Row
              label="Next allowed sync"
              value={
                quota.nextAllowedSync && quota.nextAllowedSync > Date.now()
                  ? new Date(quota.nextAllowedSync).toLocaleTimeString("he-IL")
                  : "Now"
              }
              ok={true}
              sub={`After ${quota.cacheTtlHours}h cache window`}
            />
            <Row
              label="Requests used today"
              value={String(quota.requestsToday)}
              ok={!quota.rateLimited}
              sub={`Resets at ${new Date(quota.dailyResetAt).toLocaleTimeString("he-IL")}`}
            />
            <Row
              label="Daily limit reached"
              value={quota.rateLimited
                ? `Yes — ${quota.limitHitAt ? new Date(quota.limitHitAt).toLocaleTimeString("he-IL") : "this session"}`
                : "No"}
              ok={!quota.rateLimited}
            />
            <Row
              label="Dev mode"
              value={quota.devMode ? "On" : "Off"}
              ok={true}
              sub="API_FOOTBALL_DEV_MODE"
            />

            {quota.lastApiError && (
              <div className="px-4 pb-2 pt-1">
                <p className="text-[10px] font-mono text-[#dc2626] leading-snug bg-[#fff1f2] rounded-lg px-2 py-1.5 border border-[#fca5a5]">
                  ⚠️ Last API error: {quota.lastApiError}
                </p>
              </div>
            )}

            {quota.rateLimited && (
              <div
                className="mx-4 mb-3 mt-1 px-3 py-2.5 rounded-xl"
                style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}
              >
                <p className="text-[11px] font-bold text-[#dc2626] mb-0.5">
                  🔴 מכסת API יומית נוצלה. מוצגים נתונים שמורים/מוקאפ.
                </p>
                <p className="text-[10px] text-[#7f1d1d] leading-snug">
                  All automatic API calls have been stopped for this session.
                  Reload the page tomorrow to resume live data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Configuration ─────────────────────────────────────────────── */}
        {(config || configLoading) && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader title="Configuration" icon="⚙️" />

            {configLoading && !config && (
              <div className="px-4 py-3">
                <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5fb" }} />
              </div>
            )}

            {config && (
              <>
                <Row label="FOOTBALL_DATA_PROVIDER" value={config.footballDataProvider || "auto"} mono ok={true} sub="Active data source selection" />
                <Row label="Provider class" value={config.provider} mono ok={true} />
                <Row label="USE_MOCK_DATA" value={config.isMock ? "true (mock)" : "false (live)"} ok={true} sub="Legacy switch; overridden by FOOTBALL_DATA_PROVIDER" />
                <Row label="API Key present" value={config.hasApiKey ? "Yes" : config.isMock ? "N/A" : "No ⚠️"} ok={config.isMock || config.hasApiKey} sub="Required only for api-football provider" />

                {/* ── OpenFootball info ── */}
                {config.openFootball && (
                  <>
                    <Row label="Source URL" value={config.openFootball.sourceUrl} mono sub="OpenFootball WC 2026 public dataset" />
                    <Row label="Last fetch" value={config.openFootball.lastFetchAt ? new Date(config.openFootball.lastFetchAt).toLocaleTimeString("he-IL") : "Not yet"} ok={config.openFootball.lastFetchAt !== null} />
                    <Row label="Live data" value="Not available" ok={false} sub="OpenFootball is a static dataset — no real-time scores" />
                    <Row label="Player stats" value="Not available" ok={false} sub="No top scorer or player stat data in this source" />
                  </>
                )}

                {/* ── API-Football-specific info ── */}
                {!config.isMock && config.footballDataProvider !== "openfootball" && (
                  <>
                    <Row label="Dev mode" value={config.devMode ? "true (free-plan fallback)" : "false"} ok={true} sub="API_FOOTBALL_DEV_MODE env var" />
                    <Row
                      label="Requested season"
                      value={config.season !== null ? String(config.season) : "N/A"}
                      ok={config.season === 2026}
                      sub={config.season !== 2026 ? "Not 2026 — WC 2026 data unavailable on free plan" : "API_FOOTBALL_SEASON"}
                    />
                    <Row label="Requested league ID" value={config.leagueId !== null ? String(config.leagueId) : "N/A"} ok={true} sub="API_FOOTBALL_LEAGUE_ID (1 = FIFA World Cup)" />
                    <Row
                      label="ID mapping size"
                      value={config.idMappingSize === null ? "N/A (mock)" : `${config.idMappingSize} entries`}
                      ok={config.isMock || (config.idMappingPopulated ?? false)}
                      sub="API_ID_TO_INTERNAL in apiFootballProvider.ts"
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Auth test ─────────────────────────────────────────────────── */}
        {isLive && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader
              title="Auth  GET /countries"
              icon="🔑"
              action={<TestButton onClick={testAuth} loading={auth.status === "loading"} lastRun={auth.lastRun} fromCache={auth.fromCache} />}
            />

            {auth.status === "idle" && (
              <div className="px-4 py-3 text-[11px] text-[#94a3b8]">לא נבדק עדיין — לחץ בדוק</div>
            )}
            {auth.fetchError && <ErrorBox message={auth.fetchError} />}
            {auth.result && (
              <>
                <Row label="Result" value={auth.result.ok ? "Success ✓" : "Failed ✗"} ok={auth.result.ok} sub={`${auth.result.durationMs} ms${auth.fromCache ? " · from cache" : ""}`} />
                <Row label="Request URL" value={auth.result.requestUrl} mono />
                <Row label="Header name used" value={auth.result.headerNameUsed} mono ok={auth.result.headerNameUsed === "x-apisports-key"} />
                <Row label="API key length" value={`${auth.result.apiKeyLength} chars`} ok={auth.result.apiKeyLength > 0} />
                <Row label="API key prefix / suffix" value={`${auth.result.apiKeyPrefix}…${auth.result.apiKeySuffix}`} mono />
                <Row label="HTTP status" value={auth.result.httpStatus !== null ? String(auth.result.httpStatus) : "N/A"} ok={auth.result.httpStatus === 200} />
                <Row label="errors.token present" value={auth.result.hasTokenError ? `Yes — "${auth.result.tokenErrorMessage}"` : "No"} ok={!auth.result.hasTokenError} />
                {auth.result.ok && <Row label="Countries returned" value={String(auth.result.countriesCount)} ok={auth.result.countriesCount > 0} />}
                {!auth.result.ok && auth.result.error && <ErrorBox message={auth.result.error} />}
              </>
            )}
          </div>
        )}

        {/* ── Fixtures test ─────────────────────────────────────────────── */}
        {isLive && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader
              title="Fixtures"
              icon="📅"
              action={<TestButton onClick={testFixtures} loading={fixtures.status === "loading"} lastRun={fixtures.lastRun} fromCache={fixtures.fromCache} />}
            />

            {fixtures.status === "idle" && (
              <div className="px-4 py-3 text-[11px] text-[#94a3b8]">לא נבדק עדיין — לחץ בדוק</div>
            )}
            {fixtures.fetchError && <ErrorBox message={fixtures.fetchError} />}
            {fixtures.result && (
              <>
                {fixtures.result.wc2026Unavailable && (
                  <div className="mx-4 mt-2 mb-1 px-3 py-2 rounded-xl" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
                    <p className="text-[11px] font-bold text-[#92400e]">🟡 API connected, but World Cup 2026 data unavailable on current plan</p>
                  </div>
                )}
                {fixtures.result.requestUrl && (
                  <Row label="Request URL" value={fixtures.result.requestUrl} mono sub="API key sent as header only" />
                )}
                <Row
                  label="Result"
                  value={fixtures.result.rateLimited ? "Rate limited 🔴" : fixtures.result.planRestricted ? "Plan restricted" : fixtures.result.error ? "Error" : `${fixtures.result.count} matches`}
                  ok={!fixtures.result.error && !fixtures.result.planRestricted && !fixtures.result.rateLimited}
                  sub={`${fixtures.result.durationMs} ms${fixtures.result.withApifIds > 0 ? ` · ${fixtures.result.withApifIds} with apif_ IDs` : ""}`}
                />
                {fixtures.result.error && <ErrorBox message={fixtures.result.error} />}
                {fixtures.result.withApifIds > 0 && (
                  <div className="px-4 pb-2">
                    <p className="text-[10px] text-[#78350f] bg-[#fef9c3] rounded-lg px-2 py-1.5 border border-[#fde68a]">
                      🟡 {fixtures.result.withApifIds} fixtures carry <span className="font-mono">apif_</span> IDs — ID mapping not populated yet
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Standings test ────────────────────────────────────────────── */}
        {isLive && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader
              title="Standings"
              icon="🏆"
              action={<TestButton onClick={testStandings} loading={standings.status === "loading"} lastRun={standings.lastRun} fromCache={standings.fromCache} />}
            />

            {standings.status === "idle" && (
              <div className="px-4 py-3 text-[11px] text-[#94a3b8]">לא נבדק עדיין — לחץ בדוק</div>
            )}
            {standings.fetchError && <ErrorBox message={standings.fetchError} />}
            {standings.result && (
              <>
                {standings.result.wc2026Unavailable && (
                  <div className="mx-4 mt-2 mb-1 px-3 py-2 rounded-xl" style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}>
                    <p className="text-[11px] font-bold text-[#92400e]">🟡 API connected, but World Cup 2026 data unavailable on current plan</p>
                  </div>
                )}
                <Row
                  label="Result"
                  value={standings.result.rateLimited ? "Rate limited 🔴" : standings.result.planRestricted ? "Plan restricted" : standings.result.error ? "Error" : `${standings.result.groupsCount} groups · ${standings.result.entriesCount} entries`}
                  ok={!standings.result.error && !standings.result.planRestricted && !standings.result.rateLimited}
                  sub={`${standings.result.durationMs} ms`}
                />
                {standings.result.error && <ErrorBox message={standings.result.error} />}
              </>
            )}
          </div>
        )}

        {/* ── Top Scorers test ──────────────────────────────────────────── */}
        {isLive && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader
              title="Top Scorers"
              icon="⚽"
              action={<TestButton onClick={testTopScorers} loading={topScorers.status === "loading"} lastRun={topScorers.lastRun} fromCache={topScorers.fromCache} />}
            />

            {topScorers.status === "idle" && (
              <div className="px-4 py-3 text-[11px] text-[#94a3b8]">לא נבדק עדיין — לחץ בדוק</div>
            )}
            {topScorers.fetchError && <ErrorBox message={topScorers.fetchError} />}
            {topScorers.result && (
              <>
                <Row
                  label="Result"
                  value={topScorers.result.rateLimited ? "Rate limited 🔴" : topScorers.result.planRestricted ? "Plan restricted" : topScorers.result.error ? "Error" : `${topScorers.result.count} players`}
                  ok={!topScorers.result.error && !topScorers.result.planRestricted && !topScorers.result.rateLimited}
                  sub={`${topScorers.result.durationMs} ms`}
                />
                {topScorers.result.error && <ErrorBox message={topScorers.result.error} />}
              </>
            )}
          </div>
        )}

        {/* ── Live test ─────────────────────────────────────────────────── */}
        {isLive && (
          <div
            className="mx-4 rounded-2xl overflow-hidden mb-4"
            style={{ border: "1px solid #e8eef8", boxShadow: "0 2px 12px rgba(14,30,64,.07)" }}
          >
            <SectionHeader
              title="Live Matches"
              icon="🔴"
              action={<TestButton onClick={testLive} loading={live.status === "loading"} lastRun={live.lastRun} fromCache={live.fromCache} />}
            />

            {live.status === "idle" && (
              <div className="px-4 py-3 text-[11px] text-[#94a3b8]">לא נבדק עדיין — לחץ בדוק</div>
            )}
            {live.fetchError && <ErrorBox message={live.fetchError} />}
            {live.result && (
              <>
                <Row
                  label="Result"
                  value={live.result.rateLimited ? "Rate limited 🔴" : live.result.planRestricted ? "Plan restricted" : live.result.error ? "Error" : `${live.result.count} in progress`}
                  ok={!live.result.error && !live.result.planRestricted && !live.result.rateLimited}
                  sub={`${live.result.durationMs} ms`}
                />
                {live.result.error && <ErrorBox message={live.result.error} />}
              </>
            )}
          </div>
        )}

        {/* ── Mock mode notice ──────────────────────────────────────────── */}
        {config && config.isMock && (
          <div
            className="mx-4 mb-4 px-3 py-3 rounded-2xl"
            style={{ background: "#f0fdf4", border: "1px solid #86efac" }}
          >
            <p className="text-[11px] font-bold text-[#14532d]">🟢 Mock mode — no API calls are made</p>
            <p className="text-[10px] text-[#166534] leading-snug mt-0.5">
              Set USE_MOCK_DATA=false and provide API_FOOTBALL_KEY to enable live testing.
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
