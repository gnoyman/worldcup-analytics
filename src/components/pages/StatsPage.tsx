"use client";

import { useMemo, useState, useEffect } from "react";
import { useApp } from "@/components/AppContext";
import { MOCK_PLAYERS, type PlayerStat } from "@/data/mockStats";

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
  /** true = data is example/mock, false = real API data */
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
      {/* Broadcast-style header */}
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

      {/* Column headers */}
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

      {/* Rows */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { dataSource, lastSyncAt } = useApp();
  const [players, setPlayers]   = useState<PlayerStat[]>(MOCK_PLAYERS);
  const [fromApi, setFromApi]   = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const isOpenfootball = dataSource === "openfootball";
  const isLive         = dataSource === "live";

  // Re-run whenever the data source changes so the view updates automatically.
  useEffect(() => {
    if (isOpenfootball) {
      // OpenFootball does not supply player stats — show empty state.
      setPlayers([]);
      setFromApi(false);
      setLoadDone(true);
      return;
    }

    if (!isLive) {
      // Mock / error / loading — use labelled example data.
      setPlayers(MOCK_PLAYERS);
      setFromApi(false);
      setLoadDone(true);
      return;
    }

    // Live API mode — fetch real data.
    setPlayers(MOCK_PLAYERS); // show example while loading
    setFromApi(false);

    fetch("/api/football/topscorers")
      .then((r) => r.json())
      .then((json: { ok: boolean; data: PlayerStat[] }) => {
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setPlayers(json.data);
          setFromApi(true);
        }
        // No data returned from live API — keep mock players as fallback (labelled as example)
      })
      .catch(() => {
        // Keep mock players on network error
      })
      .finally(() => setLoadDone(true));
  }, [dataSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sorted leaderboard data ───────────────────────────────────────────────

  const topScorers = useMemo(
    () => [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 10),
    [players]
  );
  const topAssists = useMemo(
    () => [...players].filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, 10),
    [players]
  );
  const topShots = useMemo(
    () => [...players].filter((p) => p.shotsOnTarget > 0).sort((a, b) => b.shotsOnTarget - a.shotsOnTarget || b.goals - a.goals).slice(0, 10),
    [players]
  );
  const topSaves = useMemo(
    () => [...players].filter((p) => p.position === "GK").sort((a, b) => b.saves - a.saves).slice(0, 8),
    [players]
  );
  const yellowCards = useMemo(
    () => [...players].filter((p) => p.yellowCards > 0).sort((a, b) => b.yellowCards - a.yellowCards || b.redCards - a.redCards).slice(0, 10),
    [players]
  );

  // Sections are "from API" only when live mode returned real player data.
  const assistsFromApi = fromApi && topAssists.length > 0;
  const shotsFromApi   = fromApi && topShots.length > 0;
  const savesFromApi   = fromApi && topSaves.length > 0;
  const cardsFromApi   = fromApi && yellowCards.length > 0;

  function fmtDateTime(ms: number) {
    return new Date(ms).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="pb-[80px]">
      {/* Hero */}
      <div
        className="px-4 pt-6 pb-5"
        style={{ background: "#fff", borderBottom: "1px solid #dde8f7" }}
      >
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

        {/* OpenFootball: no player stats available */}
        {isOpenfootball && !loadDone ? null : isOpenfootball ? (
          <PlayerStatsUnavailable />
        ) : (
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
          </>
        )}
      </div>
    </div>
  );
}
