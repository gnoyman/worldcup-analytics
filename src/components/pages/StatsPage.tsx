"use client";

import { useMemo, useState, useEffect } from "react";
import { useApp } from "@/components/AppContext";
import { MOCK_PLAYERS, type PlayerStat } from "@/data/mockStats";
import type { GroupStanding } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatColumn {
  key: string;
  label: string;
  getValue: (p: PlayerStat) => number | string;
  isMain?: boolean;
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const styles = [
      { bg: "linear-gradient(135deg,#d97706,#fbbf24)" },
      { bg: "linear-gradient(135deg,#64748b,#94a3b8)" },
      { bg: "linear-gradient(135deg,#92400e,#d97706)" },
    ];
    return (
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] text-white shrink-0 leading-none"
        style={{ background: styles[rank - 1].bg }}
      >
        {rank}
      </div>
    );
  }
  return (
    <span className="w-6 text-center text-[10px] font-bold shrink-0" style={{ color: "#94a3b8" }}>
      {rank}
    </span>
  );
}

// ── Row accent for top 3 ──────────────────────────────────────────────────────

function rowAccent(rank: number): React.CSSProperties {
  if (rank === 1) return { background: "#fffbeb", borderLeft: "3px solid #f59e0b" };
  if (rank === 2) return { background: "#f8fafc", borderLeft: "3px solid #94a3b8" };
  if (rank === 3) return { background: "#fff7ed", borderLeft: "3px solid #d97706" };
  return { borderLeft: "3px solid transparent" };
}

// ── Player row ────────────────────────────────────────────────────────────────

export interface PlayerStatRowProps {
  rank: number;
  player: PlayerStat;
  columns: StatColumn[];
  maxMain?: number;
  accentColor?: string;
}

export function PlayerStatRow({
  rank,
  player,
  columns,
  maxMain = 10,
  accentColor = "#0284c7",
}: PlayerStatRowProps) {
  const mainCol = columns.find((c) => c.isMain);
  const mainVal = mainCol ? Number(mainCol.getValue(player)) : 0;

  return (
    <div
      className="flex items-center gap-2 py-2.5 px-3 transition-colors"
      style={{ ...rowAccent(rank), borderBottom: "1px solid #f0f6ff" }}
    >
      <div className="shrink-0">
        <RankBadge rank={rank} />
      </div>

      {/* Name + team */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#0f172a] truncate leading-tight">{player.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-semibold text-[#94a3b8]">{player.teamName}</span>
            {mainVal > 0 && (
              <div className="flex-1 max-w-[60px] h-1 rounded-full overflow-hidden bg-[#e8eef8]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(mainVal / maxMain) * 100}%`, background: accentColor }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat columns */}
      {columns.map((col) => (
        <div key={col.key} className="shrink-0 w-10 text-center">
          <span
            className="font-black tabular-nums"
            style={{
              fontSize: col.isMain ? "16px" : "13px",
              color: col.isMain ? accentColor : "#64748b",
            }}
          >
            {col.getValue(player)}
          </span>
          <div className="text-[7px] font-bold text-[#94a3b8] uppercase tracking-wide mt-0.5">{col.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Leaderboard section ───────────────────────────────────────────────────────

export interface StatLeaderboardProps {
  title: string;
  icon: string;
  players: PlayerStat[];
  columns: StatColumn[];
  accentColor?: string;
  accentBg?: string;
  isMock?: boolean;
}

export function StatLeaderboard({
  title,
  icon,
  players,
  columns,
  accentColor = "#0284c7",
  accentBg = "#eff9ff",
  isMock = false,
}: StatLeaderboardProps) {
  const mainCol = columns.find((c) => c.isMain);
  const maxMain = players.length > 0 && mainCol
    ? Math.max(1, ...players.map((p) => Number(mainCol.getValue(p))))
    : 10;

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eef8", boxShadow: "0 3px 16px rgba(14,30,64,.08)" }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}bb)` }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "rgba(255,255,255,.2)" }}
        >
          {icon}
        </div>
        <h2 className="text-[15px] font-black text-white flex-1">{title}</h2>
        {isMock ? (
          <div
            className="text-[9px] font-black px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,.2)", color: "#fef9c3" }}
          >
            🟡 נתוני דוגמה
          </div>
        ) : (
          <div
            className="text-[9px] font-black px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,.2)", color: "#dcfce7" }}
          >
            🟢 API
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "#f8faff", borderBottom: "1px solid #eef3ff" }}
      >
        <div className="w-6 shrink-0" />
        <span className="flex-1 sec-label pr-7">שחקן</span>
        {columns.map((col) => (
          <span
            key={col.key}
            className="w-10 text-center sec-label"
            style={col.isMain ? { color: accentColor } : {}}
          >
            {col.label}
          </span>
        ))}
      </div>

      <div className="bg-white">
        {players.map((player, i) => (
          <PlayerStatRow
            key={player.id}
            rank={i + 1}
            player={player}
            columns={columns}
            maxMain={maxMain}
            accentColor={accentColor}
          />
        ))}
        {players.length === 0 && (
          <p className="text-center py-6 sec-label">אין נתונים</p>
        )}
      </div>
    </div>
  );
}

// ── Empty state for providers without player stats ────────────────────────────

function PlayerStatsUnavailable() {
  return (
    <div
      className="rounded-2xl p-8 text-center mt-2"
      style={{ background: "#f8faff", border: "1.5px dashed #c7d8f5" }}
    >
      <div className="text-4xl mb-3">📊</div>
      <p className="text-sm font-bold text-[#475569] mb-1">
        סטטיסטיקות שחקנים אינן זמינות במקור הנתונים הנוכחי
      </p>
      <p className="text-xs text-[#94a3b8]">
        כאשר יוחבר מקור נתונים עם סטטיסטיקות שחקנים, הדף יתעדכן אוטומטית
      </p>
    </div>
  );
}

// ── No scorers data yet (FDO — tournament not started / group stage early) ────

function NoScorersYet() {
  return (
    <div
      className="rounded-2xl p-8 text-center mb-5"
      style={{ background: "#f8faff", border: "1.5px dashed #c7d8f5" }}
    >
      <div className="text-4xl mb-3">⏳</div>
      <p className="text-sm font-bold text-[#475569] mb-1">טרם נרשמו שערים בטורניר</p>
      <p className="text-xs text-[#94a3b8]">הנתונים יעודכנו אוטומטית כאשר ישחקו משחקים</p>
    </div>
  );
}

// ── Stat unavailable from current provider ────────────────────────────────────

function UnavailableNote({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center mb-5"
      style={{ background: "#f8faff", border: "1.5px dashed #c7d8f5" }}
    >
      <p className="text-sm font-bold text-[#475569] mb-1">{label}</p>
      <p className="text-xs text-[#94a3b8]">נתון זה אינו זמין מספק הנתונים הנוכחי</p>
    </div>
  );
}

// ── Team stat leaderboard (attack / defense from GroupStanding) ───────────────

interface TeamStatRowProps {
  rank: number;
  standing: GroupStanding;
  value: number;
  maxValue: number;
  accentColor: string;
}

function TeamStatRow({ rank, standing, value, maxValue, accentColor }: TeamStatRowProps) {
  return (
    <div
      className="flex items-center gap-2 py-2.5 px-3 transition-colors"
      style={{ ...rowAccent(rank), borderBottom: "1px solid #f0f6ff" }}
    >
      <div className="shrink-0"><RankBadge rank={rank} /></div>
      <span className="text-xl leading-none shrink-0">{standing.team.flag}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#0f172a] truncate leading-tight">{standing.team.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-semibold text-[#94a3b8]">בית {standing.groupId}</span>
          {value > 0 && (
            <div className="flex-1 max-w-[60px] h-1 rounded-full overflow-hidden bg-[#e8eef8]">
              <div className="h-full rounded-full" style={{ width: `${(value / maxValue) * 100}%`, background: accentColor }} />
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 w-10 text-center">
        <span className="font-black tabular-nums text-[16px]" style={{ color: accentColor }}>{value}</span>
        <div className="text-[7px] font-bold text-[#94a3b8] uppercase tracking-wide mt-0.5">שע</div>
      </div>
      <div className="shrink-0 w-8 text-center">
        <span className="font-bold tabular-nums text-[13px] text-[#64748b]">{standing.played}</span>
        <div className="text-[7px] font-bold text-[#94a3b8] uppercase tracking-wide mt-0.5">מש</div>
      </div>
    </div>
  );
}

interface TeamStatLeaderboardProps {
  title: string;
  icon: string;
  standings: GroupStanding[];
  valueKey: "goalsFor" | "goalsAgainst";
  accentColor?: string;
  ascending?: boolean;
  limit?: number;
}

function TeamStatLeaderboard({
  title, icon, standings, valueKey, accentColor = "#0284c7", ascending = false, limit = 10,
}: TeamStatLeaderboardProps) {
  const sorted = [...standings].sort((a, b) => ascending ? a[valueKey] - b[valueKey] : b[valueKey] - a[valueKey]);
  const top = sorted.slice(0, limit);
  const maxValue = top.length > 0 ? Math.max(1, ...top.map(s => s[valueKey])) : 1;

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eef8", boxShadow: "0 3px 16px rgba(14,30,64,.08)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}bb)` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "rgba(255,255,255,.2)" }}>
          {icon}
        </div>
        <h2 className="text-[15px] font-black text-white flex-1">{title}</h2>
        <div className="text-[9px] font-black px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,.2)", color: "#dcfce7" }}>
          🟢 API
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#f8faff", borderBottom: "1px solid #eef3ff" }}>
        <div className="w-6 shrink-0" />
        <div className="w-6 shrink-0" />
        <span className="flex-1 sec-label">נבחרת</span>
        <span className="w-10 text-center sec-label" style={{ color: accentColor }}>שע</span>
        <span className="w-8 text-center sec-label">מש</span>
      </div>
      <div className="bg-white">
        {top.map((s, i) => (
          <TeamStatRow key={s.teamId} rank={i + 1} standing={s} value={s[valueKey]} maxValue={maxValue} accentColor={accentColor} />
        ))}
        {top.length === 0 && <p className="text-center py-6 sec-label">אין נתונים</p>}
      </div>
    </div>
  );
}

// ── Team performance summary (W/D/L/GF/GA) ───────────────────────────────────

function TeamPerformanceSummary({ standings }: { standings: GroupStanding[] }) {
  const sorted = [...standings]
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .slice(0, 16);

  if (sorted.length === 0) return null;

  const ACCENT = "#6d28d9";

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eef8", boxShadow: "0 3px 16px rgba(14,30,64,.08)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT}bb)` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "rgba(255,255,255,.2)" }}>
          📊
        </div>
        <h2 className="text-[15px] font-black text-white flex-1">סיכום ביצועי נבחרות</h2>
        <div className="text-[9px] font-black px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,.2)", color: "#dcfce7" }}>
          🟢 API
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-1 px-3 py-2" style={{ background: "#f8faff", borderBottom: "1px solid #eef3ff" }}>
        <div className="w-6 shrink-0" />
        <div className="w-5 shrink-0" />
        <span className="flex-1 sec-label text-[9px]">נבחרת</span>
        <span className="w-7 text-center sec-label text-[8px]" style={{ color: "#16a34a" }}>נצ</span>
        <span className="w-7 text-center sec-label text-[8px]">תק</span>
        <span className="w-7 text-center sec-label text-[8px]" style={{ color: "#dc2626" }}>הפ</span>
        <span className="w-7 text-center sec-label text-[8px]">שלטובה</span>
        <span className="w-7 text-center sec-label text-[8px]">נגד</span>
      </div>

      <div className="bg-white">
        {sorted.map((s, i) => (
          <div
            key={s.teamId}
            className="flex items-center gap-1 py-2 px-3"
            style={{ ...rowAccent(i + 1), borderBottom: "1px solid #f0f6ff" }}
          >
            <div className="shrink-0"><RankBadge rank={i + 1} /></div>
            <span className="text-base leading-none shrink-0 w-5">{s.team.flag}</span>
            <span className="flex-1 text-[12px] font-bold text-[#0f172a] truncate">{s.team.name}</span>
            <span className="w-7 text-center text-[13px] font-bold" style={{ color: "#16a34a" }}>{s.wins}</span>
            <span className="w-7 text-center text-[13px] font-bold text-[#64748b]">{s.draws}</span>
            <span className="w-7 text-center text-[13px] font-bold" style={{ color: "#dc2626" }}>{s.losses}</span>
            <span className="w-7 text-center text-[13px] font-bold text-[#0f172a]">{s.goalsFor}</span>
            <span className="w-7 text-center text-[13px] font-bold text-[#94a3b8]">{s.goalsAgainst}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { dataSource, lastSyncAt, apiStandings } = useApp();
  const [players, setPlayers]   = useState<PlayerStat[]>([]);
  const [fromApi, setFromApi]   = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const isOpenfootball = dataSource === "openfootball";
  const isFDO  = dataSource === "football-data-org";
  const isLive = dataSource === "live" || isFDO;

  useEffect(() => {
    if (isOpenfootball) {
      setPlayers([]);
      setFromApi(false);
      setLoadDone(true);
      return;
    }

    if (!isLive) {
      // Mock / error / loading — show labelled example data
      setPlayers(MOCK_PLAYERS);
      setFromApi(false);
      setLoadDone(true);
      return;
    }

    // Live mode: fetch real scorers
    // FDO: start with blank (no mock placeholder); generic live: show mock while loading
    setPlayers(isFDO ? [] : MOCK_PLAYERS);
    setFromApi(false);
    setLoadDone(false);

    fetch("/api/football/topscorers")
      .then((r) => r.json())
      .then((json: { ok: boolean; data: PlayerStat[] }) => {
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setPlayers(json.data);
          setFromApi(true);
        }
        // FDO: if empty → keep [] — no mock fallback
        // Generic live: keep MOCK_PLAYERS (already set above)
      })
      .catch(() => {
        // FDO: keep [] on error; generic live: MOCK_PLAYERS already in state
      })
      .finally(() => setLoadDone(true));
  }, [dataSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived leaderboard data ──────────────────────────────────────────────

  const topScorers = useMemo(
    () => [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 10),
    [players]
  );
  const topAssists = useMemo(
    () => [...players].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, 10),
    [players]
  );
  const goalContributions = useMemo(
    () => [...players]
      .filter(p => p.goals + p.assists > 0)
      .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals)
      .slice(0, 10),
    [players]
  );
  // Kept for non-FDO providers that do supply these fields
  const topShots = useMemo(
    () => [...players].filter(p => p.shotsOnTarget > 0).sort((a, b) => b.shotsOnTarget - a.shotsOnTarget || b.goals - a.goals).slice(0, 10),
    [players]
  );
  const topSaves = useMemo(
    () => [...players].filter(p => p.position === "GK").sort((a, b) => b.saves - a.saves).slice(0, 8),
    [players]
  );
  const yellowCards = useMemo(
    () => [...players].filter(p => p.yellowCards > 0).sort((a, b) => b.yellowCards - a.yellowCards || b.redCards - a.redCards).slice(0, 10),
    [players]
  );

  const playedStandings = useMemo(() => (apiStandings ?? []).filter(s => s.played > 0), [apiStandings]);
  const hasTeamStats = playedStandings.length > 0;

  // isMock badge for non-FDO sections
  const assistsFromApi = !isFDO && fromApi && topAssists.length > 0;
  const shotsFromApi   = !isFDO && fromApi && topShots.length > 0;
  const savesFromApi   = !isFDO && fromApi && topSaves.length > 0;
  const cardsFromApi   = !isFDO && fromApi && yellowCards.length > 0;

  // FDO rendering gates
  const fdoLoading   = isFDO && !loadDone;
  const fdoNoScorers = isFDO && loadDone && players.length === 0;
  const fdoHasData   = isFDO && fromApi && players.length > 0;

  function fmtDateTime(ms: number) {
    return new Date(ms).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="pb-[80px]">
      {/* Hero */}
      <div className="px-4 pt-6 pb-5" style={{ background: "#fff", borderBottom: "1px solid #dde8f7" }}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl">🏅</span>
          <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">סטטיסטיקות</h1>
        </div>
        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
          FIFA World Cup 2026 · שחקני הטורניר
        </p>
        {lastSyncAt !== null && (
          <p className="text-[10px] text-[#94a3b8] mt-1">
            עודכן לאחרונה: {fmtDateTime(lastSyncAt)}
          </p>
        )}
        <div className="title-bar mt-2" />
      </div>

      <div className="px-4 pt-4">

        {/* ── OpenFootball: no player stats ── */}
        {isOpenfootball ? (
          <PlayerStatsUnavailable />
        ) : isFDO ? (
          /* ── FDO mode ────────────────────────────────────────────────────── */
          <>
            {/* Loading */}
            {fdoLoading && (
              <div className="text-center py-8" style={{ color: "#94a3b8" }}>
                <div className="text-2xl mb-2">⏳</div>
                <p className="text-sm font-medium">טוען נתוני שחקנים...</p>
              </div>
            )}

            {/* No scorers yet */}
            {fdoNoScorers && <NoScorersYet />}

            {/* Real player data */}
            {fdoHasData && (
              <>
                <StatLeaderboard
                  title="מלך השערים"
                  icon="⚽"
                  players={topScorers}
                  accentColor="#b45309"
                  accentBg="#fffbeb"
                  isMock={false}
                  columns={[
                    { key: "goals",   label: "שע",    getValue: (p) => p.goals,         isMain: true },
                    { key: "assists", label: "בישול", getValue: (p) => p.assists },
                    { key: "matches", label: "מש",    getValue: (p) => p.matchesPlayed },
                  ]}
                />

                <StatLeaderboard
                  title="מלך הבישולים"
                  icon="🎯"
                  players={topAssists}
                  accentColor="#7c3aed"
                  accentBg="#fdf4ff"
                  isMock={false}
                  columns={[
                    { key: "assists", label: "בישול", getValue: (p) => p.assists,        isMain: true },
                    { key: "goals",   label: "שע",    getValue: (p) => p.goals },
                    { key: "matches", label: "מש",    getValue: (p) => p.matchesPlayed },
                  ]}
                />

                <StatLeaderboard
                  title="תרומה — שערים + בישולים"
                  icon="💥"
                  players={goalContributions}
                  accentColor="#0369a1"
                  accentBg="#e0f2fe"
                  isMock={false}
                  columns={[
                    { key: "contrib", label: "תרומה", getValue: (p) => p.goals + p.assists, isMain: true },
                    { key: "goals",   label: "שע",    getValue: (p) => p.goals },
                    { key: "assists", label: "בישול", getValue: (p) => p.assists },
                  ]}
                />
              </>
            )}

            {/* FDO: structurally unavailable stats — always show note, never mock */}
            {!fdoLoading && (
              <>
                <UnavailableNote label="בעיטות למסגרת אינן זמינות" />
                <UnavailableNote label="הצלות שוערים אינן זמינות" />
                <UnavailableNote label="כרטיסים צהובים אינם זמינים" />
              </>
            )}

            {/* Team sections — from apiStandings, always available when FDO active */}
            {hasTeamStats && (
              <>
                <TeamStatLeaderboard
                  title="נבחרות — שערים לטובה"
                  icon="🔥"
                  standings={playedStandings}
                  valueKey="goalsFor"
                  accentColor="#ea580c"
                  limit={10}
                />
                <TeamStatLeaderboard
                  title="נבחרות — שערים נגד"
                  icon="🛡️"
                  standings={playedStandings}
                  valueKey="goalsAgainst"
                  accentColor="#0891b2"
                  ascending
                  limit={8}
                />
                <TeamPerformanceSummary standings={playedStandings} />
              </>
            )}
          </>
        ) : (
          /* ── Non-FDO mode (mock / generic live) ─────────────────────────── */
          <>
            <StatLeaderboard
              title="מלך השערים"
              icon="⚽"
              players={topScorers}
              accentColor="#b45309"
              accentBg="#fffbeb"
              isMock={!fromApi}
              columns={[
                { key: "goals",   label: "שע",    getValue: (p) => p.goals,         isMain: true },
                { key: "assists", label: "בישול", getValue: (p) => p.assists },
                { key: "matches", label: "מש",    getValue: (p) => p.matchesPlayed },
              ]}
            />

            <StatLeaderboard
              title="מלך הבישולים"
              icon="🎯"
              players={topAssists}
              accentColor="#7c3aed"
              accentBg="#fdf4ff"
              isMock={!assistsFromApi}
              columns={[
                { key: "assists", label: "בישול", getValue: (p) => p.assists,        isMain: true },
                { key: "goals",   label: "שע",    getValue: (p) => p.goals },
                { key: "matches", label: "מש",    getValue: (p) => p.matchesPlayed },
              ]}
            />

            <StatLeaderboard
              title="תרומה — שערים + בישולים"
              icon="💥"
              players={goalContributions}
              accentColor="#0369a1"
              accentBg="#e0f2fe"
              isMock={!fromApi}
              columns={[
                { key: "contrib", label: "תרומה", getValue: (p) => p.goals + p.assists, isMain: true },
                { key: "goals",   label: "שע",    getValue: (p) => p.goals },
                { key: "assists", label: "בישול", getValue: (p) => p.assists },
              ]}
            />

            {topShots.length > 0 ? (
              <StatLeaderboard
                title="בעיטות למסגרת"
                icon="🥊"
                players={topShots}
                accentColor="#0284c7"
                accentBg="#eff9ff"
                isMock={!shotsFromApi}
                columns={[
                  { key: "shots",   label: "בעיטות", getValue: (p) => p.shotsOnTarget, isMain: true },
                  { key: "goals",   label: "שע",     getValue: (p) => p.goals },
                  { key: "matches", label: "מש",     getValue: (p) => p.matchesPlayed },
                ]}
              />
            ) : null}

            {topSaves.length > 0 ? (
              <StatLeaderboard
                title="שוערים — הצלות"
                icon="🧤"
                players={topSaves}
                accentColor="#16a34a"
                accentBg="#f0fdf4"
                isMock={!savesFromApi}
                columns={[
                  { key: "saves",   label: "הצלות", getValue: (p) => p.saves,          isMain: true },
                  { key: "matches", label: "מש",    getValue: (p) => p.matchesPlayed },
                ]}
              />
            ) : null}

            {yellowCards.length > 0 ? (
              <StatLeaderboard
                title="כרטיסים צהובים"
                icon="🟨"
                players={yellowCards}
                accentColor="#dc2626"
                accentBg="#fff1f2"
                isMock={!cardsFromApi}
                columns={[
                  { key: "yellow",  label: "🟨",  getValue: (p) => p.yellowCards,     isMain: true },
                  { key: "red",     label: "🟥",  getValue: (p) => p.redCards },
                  { key: "matches", label: "מש",  getValue: (p) => p.matchesPlayed },
                ]}
              />
            ) : null}

            {hasTeamStats && (
              <>
                <TeamStatLeaderboard
                  title="נבחרות — שערים לטובה"
                  icon="🔥"
                  standings={playedStandings}
                  valueKey="goalsFor"
                  accentColor="#ea580c"
                  limit={10}
                />
                <TeamStatLeaderboard
                  title="נבחרות — שערים נגד"
                  icon="🛡️"
                  standings={playedStandings}
                  valueKey="goalsAgainst"
                  accentColor="#0891b2"
                  ascending
                  limit={8}
                />
                <TeamPerformanceSummary standings={playedStandings} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
