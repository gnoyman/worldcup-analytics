"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import type { DataSource } from "@/components/AppContext";
import type { GroupStanding, Match, Team } from "@/types";

// ── Data source badge ─────────────────────────────────────────────────────────

const SOURCE_CFG: Record<DataSource, { dot: string; label: string; color: string; bg: string }> = {
  live:         { dot: "🟢", label: "Live API",     color: "#15803d", bg: "#dcfce7" },
  openfootball: { dot: "🟢", label: "OpenFootball", color: "#1d4ed8", bg: "#dbeafe" },
  mock:         { dot: "🟡", label: "Mock",         color: "#92400e", bg: "#fef9c3" },
  error:        { dot: "🔴", label: "שגיאה",        color: "#dc2626", bg: "#fee2e2" },
  loading:      { dot: "⏳", label: "טוען…",        color: "#64748b", bg: "#f1f5f9" },
};

// ── Group accent colors ───────────────────────────────────────────────────────

const GRP: Record<string, { a: string; b: string; c: string }> = {
  A: { a: "#0369a1", b: "#0ea5e9", c: "#e0f2fe" },
  B: { a: "#065f46", b: "#10b981", c: "#d1fae5" },
  C: { a: "#6b21a8", b: "#a855f7", c: "#f3e8ff" },
  D: { a: "#c2410c", b: "#f97316", c: "#ffedd5" },
  E: { a: "#be123c", b: "#f43f5e", c: "#ffe4e6" },
  F: { a: "#164e63", b: "#06b6d4", c: "#cffafe" },
  G: { a: "#92400e", b: "#f59e0b", c: "#fef9c3" },
  H: { a: "#3730a3", b: "#6366f1", c: "#e0e7ff" },
  I: { a: "#115e59", b: "#14b8a6", c: "#ccfbf1" },
  J: { a: "#3f6212", b: "#84cc16", c: "#f7fee7" },
  K: { a: "#9d174d", b: "#ec4899", c: "#fce7f3" },
  L: { a: "#1e3a8a", b: "#3b82f6", c: "#dbeafe" },
};

const GROUP_IDS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEB_DAYS   = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function hebDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(`${y}-${m}-${d}`);
  return `${HEB_DAYS[dt.getDay()]}, ${parseInt(d)} ב${HEB_MONTHS[parseInt(m)-1]} ${y}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: "1px solid #edf2f7",
        boxShadow: "0 2px 16px rgba(14,30,64,0.07), 0 1px 4px rgba(14,30,64,0.04)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, iconGrad,
}: {
  icon: string; label: string; value: string; sub: string; iconGrad: string;
}) {
  return (
    <Card style={{ padding: "18px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: "52px", height: "52px",
            borderRadius: "16px",
            background: iconGrad,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>{label}</p>
          <p style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", lineHeight: 1, marginBottom: "2px" }}>{value}</p>
          <p style={{ fontSize: "10px", color: "#94a3b8" }}>{sub}</p>
        </div>
      </div>
    </Card>
  );
}

// ── Today match row (inside hero card) ────────────────────────────────────────

function TodayRow({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const done    = m.status === "played";
  const hasScore = done && m.homeScore !== undefined && m.awayScore !== undefined;
  const hw      = hasScore && m.homeScore! > m.awayScore!;
  const aw      = hasScore && m.awayScore! > m.homeScore!;

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
      {/* Teams row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", opacity: done && !hw ? 0.5 : 1 }}>
          <span style={{ fontSize: "13px", fontWeight: hw ? 700 : 500, color: hw ? "#0f172a" : "#475569", textAlign: "right" }}>{h.name}</span>
          <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
        </div>

        {/* Score / time pill */}
        {hasScore ? (
          <div style={{
            background: "#0f172a", color: "#fff",
            padding: "5px 12px", borderRadius: "10px",
            fontWeight: 900, fontSize: "16px",
            display: "flex", alignItems: "center", gap: "4px",
            flexShrink: 0,
          }}>
            <span style={{ color: hw ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>{m.homeScore}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>–</span>
            <span style={{ color: aw ? "#fbbf24" : "rgba(255,255,255,0.5)" }}>{m.awayScore}</span>
          </div>
        ) : (
          <div style={{
            background: "#eff9ff", border: "1px solid #bae6fd", color: "#0284c7",
            padding: "5px 12px", borderRadius: "10px",
            fontWeight: 800, fontSize: "14px",
            flexShrink: 0, minWidth: "54px", textAlign: "center",
          }}>
            {m.time ?? "vs"}
          </div>
        )}

        {/* Away */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", opacity: done && !aw ? 0.5 : 1 }}>
          <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
          <span style={{ fontSize: "13px", fontWeight: aw ? 700 : 500, color: aw ? "#0f172a" : "#475569" }}>{a.name}</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
        <span style={{
          fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
          background: "#f1f5f9", color: "#64748b",
        }}>בית {m.groupId}</span>
        <span style={{
          fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
          display: "flex", alignItems: "center", gap: "4px",
          ...(done
            ? { background: "#dcfce7", color: "#16a34a" }
            : { background: "#eff9ff", color: "#0284c7" }),
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
            background: done ? "#16a34a" : "#0284c7",
          }} />
          {done ? "הסתיים" : "עתידי"}
        </span>
      </div>
    </div>
  );
}

// ── Upcoming individual match card ────────────────────────────────────────────

function UpcomingCard({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const grp = GRP[m.groupId] ?? GRP["A"];

  return (
    <Card>
      {/* Top accent band */}
      <div style={{
        padding: "8px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: grp.c,
        borderBottom: `2px solid ${grp.b}20`,
      }}>
        {m.time ? (
          <span style={{ fontSize: "12px", fontWeight: 800, color: grp.a }}>{m.time}</span>
        ) : (
          <span style={{ fontSize: "10px", color: grp.a, opacity: 0.7 }}>—</span>
        )}
        <span style={{
          fontSize: "10px", fontWeight: 700,
          padding: "2px 8px", borderRadius: "999px",
          background: grp.b, color: "#fff",
        }}>בית {m.groupId}</span>
      </div>

      {/* Teams */}
      <div style={{ padding: "18px 14px 16px", display: "flex", alignItems: "center" }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "40px", lineHeight: 1 }}>{h.flag}</span>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", textAlign: "center", lineHeight: 1.2 }}>{h.name}</p>
        </div>

        {/* VS divider */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", gap: "3px" }}>
          <span style={{ fontSize: "12px", fontWeight: 900, color: "#94a3b8" }}>vs</span>
          {m.date && (
            <span style={{ fontSize: "9px", color: "#cbd5e1", fontWeight: 600 }}>{shortDate(m.date)}</span>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "40px", lineHeight: 1 }}>{a.flag}</span>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a", textAlign: "center", lineHeight: 1.2 }}>{a.name}</p>
        </div>
      </div>
    </Card>
  );
}

// ── Featured group table ──────────────────────────────────────────────────────

function FeaturedGroupTable({
  tournament, apiStandings,
}: {
  tournament: import("@/types").TournamentState;
  apiStandings: GroupStanding[] | null;
}) {
  const [grpId, setGrpId] = useState<string>("A");

  const local = tournament.standings.reduce((a, s) => {
    if (!a[s.groupId]) a[s.groupId] = [];
    a[s.groupId].push(s); return a;
  }, {} as Record<string, GroupStanding[]>);

  const api = (apiStandings ?? []).reduce((a, s) => {
    if (!a[s.groupId]) a[s.groupId] = [];
    a[s.groupId].push(s); return a;
  }, {} as Record<string, GroupStanding[]>);

  const rows = api[grpId]?.length ? api[grpId] : (local[grpId] ?? []);
  const g    = GRP[grpId] ?? GRP["A"];
  const idx  = GROUP_IDS.indexOf(grpId as typeof GROUP_IDS[number]);
  const prev = () => setGrpId(GROUP_IDS[((idx - 1) + GROUP_IDS.length) % GROUP_IDS.length]);
  const next = () => setGrpId(GROUP_IDS[(idx + 1) % GROUP_IDS.length]);

  const rankColor = (p: number) =>
    p === 1 ? "#f59e0b" : p === 2 ? "#3b82f6" : p === 3 ? "#f97316" : "#e2e8f0";
  const rankText  = (p: number) => p <= 3 ? "#fff" : "#94a3b8";

  return (
    <Card>
      {/* Card header */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>📊</span>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>טבלת בתים</span>
        </div>
        <Link
          href="/?tab=groups"
          style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}
        >
          כל הבתים ←
        </Link>
      </div>

      {/* Group navigation */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        background: g.c,
        borderTop: "1px solid #f1f5f9",
        borderBottom: "1px solid #f1f5f9",
      }}>
        <button
          onClick={next}
          style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "#fff", border: "1px solid #e2e8f0",
            color: "#475569", fontWeight: 700, fontSize: "14px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >‹</button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: `linear-gradient(135deg,${g.a},${g.b})` }} />
          <span style={{ fontSize: "14px", fontWeight: 900, color: g.a }}>בית {grpId}</span>
        </div>
        <button
          onClick={prev}
          style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: "#fff", border: "1px solid #e2e8f0",
            color: "#475569", fontWeight: 700, fontSize: "14px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >›</button>
      </div>

      {/* Table head */}
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "6px 12px",
        background: `linear-gradient(135deg,${g.a},${g.b})`,
      }}>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>#</span>
        <span style={{ flex: 1, fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>נבחרת</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>מ׳</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>נצ׳</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>הפ</span>
        <span style={{ width: "26px", fontSize: "11px", fontWeight: 900, color: "#fff", textAlign: "center" }}>נק׳</span>
      </div>

      {/* Table rows */}
      <div>
        {rows.length === 0 ? (
          <p style={{ textAlign: "center", padding: "24px", fontSize: "13px", color: "#94a3b8" }}>אין נתונים</p>
        ) : rows.map((s, i) => (
          <div
            key={s.teamId}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "9px 12px",
              background: i === 0 ? "#fffbeb" : i === 1 ? "#eff6ff" : "#fff",
              borderLeft: `3px solid ${rankColor(s.position)}`,
              borderBottom: i < rows.length - 1 ? "1px solid #f5f7fb" : "none",
            }}
          >
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
              background: rankColor(s.position), color: rankText(s.position),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 900,
            }}>{s.position}</div>

            <span style={{ fontSize: "17px", lineHeight: 1, flexShrink: 0 }}>{s.team.flag}</span>

            <span style={{ flex: 1, fontSize: "12px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.team.name}
            </span>

            <span style={{ width: "22px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>{s.played}</span>
            <span style={{ width: "22px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#475569" }}>{s.wins}</span>
            <span style={{
              width: "22px", textAlign: "center", fontSize: "11px", fontWeight: 700,
              color: s.goalDifference > 0 ? "#16a34a" : s.goalDifference < 0 ? "#dc2626" : "#94a3b8",
            }}>
              {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
            </span>
            <span style={{ width: "26px", textAlign: "center", fontSize: "13px", fontWeight: 900, color: g.b }}>{s.points}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ padding: "8px 12px 10px", display: "flex", gap: "12px", flexWrap: "wrap", borderTop: "1px solid #f1f5f9" }}>
        {[["#f59e0b","1 — עולה"], ["#3b82f6","2 — עולה"], ["#f97316","3 — מועמד"]].map(([c, lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: c, flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Qualified column (inside qualified card) ──────────────────────────────────

function QualCol({ label, teams, color, bg }: { label: string; teams: { teamId: string; team: { flag: string; name: string } }[]; color: string; bg: string }) {
  return (
    <div>
      <p style={{ fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
        {teams.map(t => (
          <div key={t.teamId} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "10px", background: bg }}>
            <span style={{ fontSize: "14px", lineHeight: 1 }}>{t.team.flag}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>{t.team.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LivePage() {
  const { tournament, dataSource, teamsById, lastSyncAt, apiStandings } = useApp();

  const allTeams       = tournament.groups.flatMap(g => g.teams);
  const total          = tournament.matches.length;
  const played         = tournament.matches.filter(m => m.status === "played").length;
  const remaining      = total - played;

  const today = new Date().toISOString().slice(0, 10);

  const todayMatches = tournament.matches
    .filter(m => m.date === today)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const futureMatches = tournament.matches
    .filter(m => m.date > today && m.status === "unplayed")
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

  const completedMatches = tournament.matches
    .filter(m => m.status === "played")
    .sort((a, b) => b.date.localeCompare(a.date));

  const futureByDate = new Map<string, Match[]>();
  for (const m of futureMatches) {
    if (!futureByDate.has(m.date)) futureByDate.set(m.date, []);
    futureByDate.get(m.date)!.push(m);
  }

  const q1 = tournament.standings.filter(s => s.position === 1);
  const q2 = tournament.standings.filter(s => s.position === 2);
  const q3 = tournament.thirdPlaceTeams;

  const src = SOURCE_CFG[dataSource];

  function find(id: string): Team | null {
    return teamsById.get(id) ?? allTeams.find(t => t.id === id) ?? null;
  }

  // page-level styles (inline to keep within the light-bg bubble)
  const PAGE: React.CSSProperties = {
    background: "#f4f7fb",
    minHeight: "100vh",
    paddingBottom: "100px",
  };
  const SECTION: React.CSSProperties = {
    padding: "0 16px",
  };

  return (
    <div style={PAGE}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #edf2f7", padding: "18px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>📅</span>
            <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>משחקים</h1>
          </div>
          <span style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
            background: src.bg, color: src.color,
          }}>
            {src.dot} {src.label}
          </span>
        </div>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase" }}>
          FIFA World Cup 2026 · מונדיאל 2026
        </p>
        <div style={{ height: "3px", width: "32px", borderRadius: "3px", background: "linear-gradient(to right,#0284c7,#38bdf8)", marginTop: "10px" }} />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── 3 summary stat cards ──────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <StatCard
            icon="📅"
            label="משחקים שהסתיימו"
            value={String(played)}
            sub={`מתוך ${total}`}
            iconGrad="linear-gradient(135deg,#dbeafe,#bfdbfe)"
          />
          <StatCard
            icon="⚽"
            label="משחקים שנותרו"
            value={String(remaining)}
            sub={`מתוך ${total}`}
            iconGrad="linear-gradient(135deg,#d1fae5,#a7f3d0)"
          />
          <StatCard
            icon="🕐"
            label="עודכן לאחרונה"
            value={lastSyncAt ? fmtDateTime(lastSyncAt) : "—"}
            sub="סנכרון נתונים"
            iconGrad="linear-gradient(135deg,#ede9fe,#ddd6fe)"
          />
        </div>

        {/* ── 2-col: group table (right/DOM-1st) + today hero (left/DOM-2nd) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "16px" }}>

          {/* RTL-right col: group table */}
          <FeaturedGroupTable tournament={tournament} apiStandings={apiStandings} />

          {/* RTL-left col: today's matches hero */}
          <Card>
            {/* Card header */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>המשחקים של היום</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{hebDate(today)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            {todayMatches.length === 0 ? (
              /* Beautiful empty state */
              <div style={{
                padding: "40px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                background: "linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 50%,#f0fdf4 100%)",
              }}>
                <div style={{
                  fontSize: "64px", lineHeight: 1, marginBottom: "16px",
                  filter: "drop-shadow(0 4px 12px rgba(2,132,199,0.25))",
                }}>⚽</div>
                <p style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", marginBottom: "6px" }}>אין משחקים היום</p>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>{hebDate(today)}</p>
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>המשחקים הבאים יתחילו בקרוב ↓</p>
              </div>
            ) : (
              <div style={{ padding: "0 16px" }}>
                {todayMatches.map(m => <TodayRow key={m.id} m={m} findTeam={find} />)}
              </div>
            )}

            {/* Footer link */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
              <button style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>←</span> צפה בכל משחקי היום
              </button>
            </div>
          </Card>
        </div>

        {/* ── Upcoming matches ──────────────────────────────────────── */}
        {futureMatches.length > 0 && (
          <div>
            {/* Section title */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>משחקים עתידיים</h2>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            {/* Date groups with 2-col card grids */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[...futureByDate.entries()].map(([date, matches]) => (
                <div key={date}>
                  {/* Date divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 800, color: "#475569",
                      background: "#e2e8f0", padding: "3px 10px", borderRadius: "999px",
                    }}>
                      {hebDate(date)}
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "#eef2f7" }} />
                  </div>

                  {/* 2-col cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                    {matches.map(m => <UpcomingCard key={m.id} m={m} findTeam={find} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Completed matches ──────────────────────────────────────── */}
        {completedMatches.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#0f172a" }}>✅ משחקים שהסתיימו ({completedMatches.length})</h2>
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {completedMatches.map(m => {
                const h = find(m.homeTeamId);
                const a = find(m.awayTeamId);
                if (!h || !a) return null;
                const hw = (m.homeScore ?? 0) > (m.awayScore ?? 0);
                const aw = (m.awayScore ?? 0) > (m.homeScore ?? 0);
                return (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 12px", borderRadius: "12px",
                    background: "#fff", border: "1px solid #edf2f7",
                    boxShadow: "0 1px 4px rgba(14,30,64,0.04)",
                  }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", opacity: hw ? 1 : 0.5 }}>
                      <span style={{ fontSize: "11px", fontWeight: hw ? 700 : 500, color: hw ? "#0f172a" : "#94a3b8" }}>{h.name}</span>
                      <span style={{ fontSize: "16px", lineHeight: 1 }}>{h.flag}</span>
                    </div>
                    <div style={{
                      background: "#0f172a", color: "#fff",
                      padding: "3px 10px", borderRadius: "8px",
                      fontWeight: 800, fontSize: "13px",
                      display: "flex", gap: "3px", flexShrink: 0,
                    }}>
                      <span style={{ color: hw ? "#fbbf24" : "rgba(255,255,255,0.45)" }}>{m.homeScore}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>–</span>
                      <span style={{ color: aw ? "#fbbf24" : "rgba(255,255,255,0.45)" }}>{m.awayScore}</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", opacity: aw ? 1 : 0.5 }}>
                      <span style={{ fontSize: "16px", lineHeight: 1 }}>{a.flag}</span>
                      <span style={{ fontSize: "11px", fontWeight: aw ? 700 : 500, color: aw ? "#0f172a" : "#94a3b8" }}>{a.name}</span>
                    </div>
                    <span style={{ fontSize: "9px", color: "#94a3b8", flexShrink: 0 }}>
                      {m.date.split("-").reverse().join("/")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Data source note ──────────────────────────────────────── */}
        {dataSource === "openfootball" && (
          <div style={{
            padding: "12px 14px", borderRadius: "14px", fontSize: "12px", fontWeight: 500,
            background: "#eff9ff", border: "1px solid #bae6fd", color: "#0284c7",
          }}>
            ℹ️ מקור הנתונים הנוכחי אינו לייב. מוצגים נתונים לפי הסנכרון האחרון.
          </div>
        )}

        {/* ── Qualified teams ────────────────────────────────────────── */}
        <Card style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "20px" }}>🏆</span>
            <h2 style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>זכאיות להמשך</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: q3.length ? "12px" : 0 }}>
            <QualCol label={`ראשיות (${q1.length}/12)`} teams={q1} color="#f59e0b" bg="#fffbeb" />
            <QualCol label={`שניות (${q2.length}/12)`}  teams={q2} color="#0284c7" bg="#eff9ff" />
          </div>
          {q3.length > 0 && (
            <>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                8 שלישיות טובות ({q3.length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {q3.map(t => (
                  <div key={t.teamId} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "4px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700,
                    background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c",
                  }}>
                    <span style={{ fontSize: "13px" }}>{t.team.flag}</span>
                    <span>{t.team.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  );
}
