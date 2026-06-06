"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import type { DataSource } from "@/components/AppContext";
import type { GroupStanding, Match, Team, TournamentState } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SRC: Record<DataSource, { dot: string; label: string; color: string; bg: string; border: string }> = {
  live:         { dot: "🟢", label: "Live API",     color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  openfootball: { dot: "🟢", label: "OpenFootball", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  mock:         { dot: "🟡", label: "Mock Data",    color: "#92400e", bg: "#fef9c3", border: "#fde68a" },
  error:        { dot: "🔴", label: "שגיאה",        color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  loading:      { dot: "⏳", label: "טוען…",        color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
};

const GRP: Record<string, { grad: string; accent: string; pale: string }> = {
  A: { grad: "linear-gradient(135deg,#0369a1,#0ea5e9)", accent: "#0ea5e9", pale: "#e0f2fe" },
  B: { grad: "linear-gradient(135deg,#065f46,#10b981)", accent: "#10b981", pale: "#d1fae5" },
  C: { grad: "linear-gradient(135deg,#6b21a8,#a855f7)", accent: "#a855f7", pale: "#f3e8ff" },
  D: { grad: "linear-gradient(135deg,#c2410c,#f97316)", accent: "#f97316", pale: "#ffedd5" },
  E: { grad: "linear-gradient(135deg,#be123c,#f43f5e)", accent: "#f43f5e", pale: "#ffe4e6" },
  F: { grad: "linear-gradient(135deg,#164e63,#06b6d4)", accent: "#06b6d4", pale: "#cffafe" },
  G: { grad: "linear-gradient(135deg,#92400e,#f59e0b)", accent: "#f59e0b", pale: "#fef9c3" },
  H: { grad: "linear-gradient(135deg,#3730a3,#6366f1)", accent: "#6366f1", pale: "#e0e7ff" },
  I: { grad: "linear-gradient(135deg,#115e59,#14b8a6)", accent: "#14b8a6", pale: "#ccfbf1" },
  J: { grad: "linear-gradient(135deg,#3f6212,#84cc16)", accent: "#84cc16", pale: "#f7fee7" },
  K: { grad: "linear-gradient(135deg,#9d174d,#ec4899)", accent: "#ec4899", pale: "#fce7f3" },
  L: { grad: "linear-gradient(135deg,#1e3a8a,#3b82f6)", accent: "#3b82f6", pale: "#dbeafe" },
};

const GROUP_IDS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;
const HEB_DAYS   = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hebDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(`${y}-${m}-${d}`);
  return `${HEB_DAYS[dt.getDay()]}, ${parseInt(d)} ב${HEB_MONTHS[parseInt(m) - 1]} ${y}`;
}

function isoToSlash(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDT(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #edf2f7",
      boxShadow: "0 2px 14px rgba(14,30,64,0.07), 0 1px 3px rgba(14,30,64,0.04)",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
      <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", margin: 0 }}>{text}</h2>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, iconGrad }: {
  icon: string; label: string; value: string; sub: string; iconGrad: string;
}) {
  return (
    <Card style={{ padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "50px", height: "50px", borderRadius: "14px",
          background: iconGrad,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px", flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>{label}</p>
          <p style={{ fontSize: "24px", fontWeight: 900, color: "#0f172a", lineHeight: 1, margin: "0 0 2px" }}>{value}</p>
          <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>{sub}</p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Today's match sub-card (inside the section card)
// ─────────────────────────────────────────────────────────────────────────────

function TodayMatchSubCard({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const done     = m.status === "played";
  const hasScore = done && m.homeScore !== undefined && m.awayScore !== undefined;
  const hw       = hasScore && m.homeScore! > m.awayScore!;
  const aw       = hasScore && m.awayScore! > m.homeScore!;

  return (
    <div style={{
      border: "1px solid #e8edf5",
      borderRadius: "12px",
      padding: "12px 14px 10px",
      background: "#f9fbff",
    }}>
      {/* Teams + score row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Home team — right in RTL */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          justifyContent: "flex-end", gap: "7px",
          opacity: hasScore && !hw ? 0.5 : 1,
        }}>
          <span style={{ fontSize: "13px", fontWeight: hw ? 800 : 500, color: hw ? "#0f172a" : "#64748b", textAlign: "right" }}>
            {h.name}
          </span>
          <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
        </div>

        {/* Score pill or time */}
        {hasScore ? (
          <div style={{
            background: "#0f172a", color: "#fff",
            padding: "5px 12px", borderRadius: "9px",
            fontWeight: 900, fontSize: "15px",
            display: "flex", alignItems: "center", gap: "2px",
            flexShrink: 0, minWidth: "62px", justifyContent: "center",
          }}>
            <span style={{ color: hw ? "#fbbf24" : "rgba(255,255,255,0.45)" }}>{m.homeScore}</span>
            <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 3px", fontSize: "12px" }}>-</span>
            <span style={{ color: aw ? "#fbbf24" : "rgba(255,255,255,0.45)" }}>{m.awayScore}</span>
          </div>
        ) : (
          <div style={{
            background: "#eff9ff", border: "1px solid #bae6fd", color: "#0284c7",
            padding: "5px 12px", borderRadius: "9px",
            fontWeight: 800, fontSize: "13px",
            flexShrink: 0, minWidth: "56px", textAlign: "center",
          }}>
            {m.time ?? "vs"}
          </div>
        )}

        {/* Away team — left in RTL */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "7px",
          opacity: hasScore && !aw ? 0.5 : 1,
        }}>
          <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
          <span style={{ fontSize: "13px", fontWeight: aw ? 800 : 500, color: aw ? "#0f172a" : "#64748b" }}>
            {a.name}
          </span>
        </div>
      </div>

      {/* Status + group badges */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: "6px",
        marginTop: "8px",
      }}>
        <span style={{
          fontSize: "10px", fontWeight: 700,
          padding: "2px 9px", borderRadius: "999px",
          background: "#f1f5f9", color: "#64748b",
        }}>
          בית {m.groupId}
        </span>
        <span style={{
          fontSize: "10px", fontWeight: 700,
          padding: "2px 9px", borderRadius: "999px",
          display: "flex", alignItems: "center", gap: "4px",
          ...(done
            ? { background: "#dcfce7", color: "#16a34a" }
            : { background: "#eff9ff", color: "#0284c7" }),
        }}>
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: done ? "#16a34a" : "#0284c7",
            flexShrink: 0,
          }} />
          {done ? "הסתיים" : (m.time ? m.time : "עתידי")}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Featured group standings card
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedGroup({ tournament, apiStandings }: {
  tournament: TournamentState;
  apiStandings: GroupStanding[] | null;
}) {
  const [grpId, setGrpId] = useState<string>("A");

  const local = tournament.standings.reduce((acc, s) => {
    if (!acc[s.groupId]) acc[s.groupId] = [];
    acc[s.groupId].push(s);
    return acc;
  }, {} as Record<string, GroupStanding[]>);

  const remote = (apiStandings ?? []).reduce((acc, s) => {
    if (!acc[s.groupId]) acc[s.groupId] = [];
    acc[s.groupId].push(s);
    return acc;
  }, {} as Record<string, GroupStanding[]>);

  const rows = remote[grpId]?.length ? remote[grpId] : (local[grpId] ?? []);
  const g    = GRP[grpId] ?? GRP["A"];
  const idx  = GROUP_IDS.indexOf(grpId as typeof GROUP_IDS[number]);
  const goPrev = () => setGrpId(GROUP_IDS[((idx - 1) + GROUP_IDS.length) % GROUP_IDS.length]);
  const goNext = () => setGrpId(GROUP_IDS[(idx + 1) % GROUP_IDS.length]);

  const rankBg   = (p: number) => p === 1 ? "#f59e0b" : p === 2 ? "#3b82f6" : p === 3 ? "#f97316" : "#e2e8f0";
  const rankFg   = (p: number) => p <= 3 ? "#fff" : "#94a3b8";
  const rowBg    = (p: number) => p === 1 ? "#fffbeb" : p === 2 ? "#eff6ff" : "#fff";
  const borderL  = (p: number) => p === 1 ? "#f59e0b" : p === 2 ? "#3b82f6" : p === 3 ? "#f97316" : "transparent";

  const NavBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} style={{
      width: "28px", height: "28px", borderRadius: "50%",
      background: "#fff", border: "1px solid #d1d5db",
      color: "#64748b", fontSize: "14px", fontWeight: 700,
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>{label}</button>
  );

  return (
    <Card>
      {/* Card header */}
      <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ fontSize: "17px" }}>📊</span>
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>טבלת בתים</span>
        </div>
        <Link href="/?tab=groups" style={{
          fontSize: "11px", fontWeight: 700, color: "#0284c7",
          display: "flex", alignItems: "center", gap: "3px",
          textDecoration: "none",
        }}>
          צפייה בכל הבתים <span>←</span>
        </Link>
      </div>

      {/* Group navigator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: g.pale,
        borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9",
      }}>
        <NavBtn label="›" onClick={goPrev} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: g.grad, flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a" }}>בית {grpId}</span>
        </div>
        <NavBtn label="‹" onClick={goNext} />
      </div>

      {/* Table header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "6px 12px",
        background: g.grad,
      }}>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>#</span>
        <span style={{ flex: 1, fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.08em" }}>נבחרת</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>מ׳</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>נצ׳</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>ת׳</span>
        <span style={{ width: "22px", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>הפ</span>
        <span style={{ width: "26px", fontSize: "11px", fontWeight: 900, color: "#fff", textAlign: "center" }}>נק׳</span>
      </div>

      {/* Table rows */}
      {rows.length === 0 ? (
        <p style={{ textAlign: "center", padding: "20px", fontSize: "13px", color: "#94a3b8" }}>אין נתונים</p>
      ) : rows.map((s, i) => (
        <div key={s.teamId} style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "9px 12px",
          background: rowBg(s.position),
          borderLeft: `3px solid ${borderL(s.position)}`,
          borderBottom: i < rows.length - 1 ? "1px solid #f5f7fb" : "none",
        }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
            background: rankBg(s.position), color: rankFg(s.position),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "9px", fontWeight: 900,
          }}>{s.position}</div>

          <span style={{ fontSize: "17px", lineHeight: 1, flexShrink: 0 }}>{s.team.flag}</span>

          <span style={{
            flex: 1, fontSize: "12px", fontWeight: 600, color: "#0f172a",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{s.team.name}</span>

          <span style={{ width: "22px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>{s.played}</span>
          <span style={{ width: "22px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#475569" }}>{s.wins}</span>
          <span style={{ width: "22px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>{s.draws}</span>
          <span style={{
            width: "22px", textAlign: "center", fontSize: "11px", fontWeight: 700,
            color: s.goalDifference > 0 ? "#16a34a" : s.goalDifference < 0 ? "#dc2626" : "#94a3b8",
          }}>
            {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
          </span>
          <span style={{ width: "26px", textAlign: "center", fontSize: "13px", fontWeight: 900, color: g.accent }}>
            {s.points}
          </span>
        </div>
      ))}

      {/* Legend */}
      <div style={{
        padding: "8px 12px 10px",
        display: "flex", gap: "10px", flexWrap: "wrap",
        borderTop: "1px solid #f1f5f9",
      }}>
        {[
          ["#f59e0b", "1 — עולה"],
          ["#3b82f6", "2 — עולה"],
          ["#f97316", "3 — מועמד"],
        ].map(([c, lbl]) => (
          <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: c, flexShrink: 0 }} />
            <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>{lbl}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming match row (inside a date column)
// ─────────────────────────────────────────────────────────────────────────────

function UpcomingRow({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  return (
    <div style={{
      padding: "9px 14px",
      borderBottom: "1px solid #f4f6fa",
    }}>
      {/* Teams + time */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {/* Time */}
        <span style={{
          fontSize: "11px", fontWeight: 800, color: "#475569",
          flexShrink: 0, minWidth: "34px",
        }}>{m.time ?? "–"}</span>

        {/* Home (right in RTL) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "5px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {h.name}
          </span>
          <span style={{ fontSize: "19px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
        </div>

        <span style={{ fontSize: "9px", fontWeight: 700, color: "#cbd5e1", padding: "0 3px", flexShrink: 0 }}>–</span>

        {/* Away (left in RTL) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ fontSize: "19px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.name}
          </span>
        </div>
      </div>

      {/* Group badge */}
      <div style={{ marginTop: "4px", display: "flex", gap: "5px", alignItems: "center" }}>
        <span style={{
          fontSize: "9px", fontWeight: 600, color: "#94a3b8",
        }}>בית {m.groupId}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date column card for upcoming matches
// ─────────────────────────────────────────────────────────────────────────────

function DateColumn({ date, matches, findTeam }: {
  date: string; matches: Match[]; findTeam: (id: string) => Team | null;
}) {
  return (
    <Card>
      <div style={{
        padding: "9px 14px",
        background: "#f8faff",
        borderBottom: "1px solid #edf2f7",
      }}>
        <p style={{
          fontSize: "11px", fontWeight: 800, color: "#475569",
          textTransform: "uppercase", letterSpacing: "0.05em",
          margin: 0,
        }}>
          {hebDate(date)}
        </p>
      </div>
      {matches.map(m => (
        <UpcomingRow key={m.id} m={m} findTeam={findTeam} />
      ))}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent result row
// ─────────────────────────────────────────────────────────────────────────────

function ResultRow({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const hw = (m.homeScore ?? 0) > (m.awayScore ?? 0);
  const aw = (m.awayScore ?? 0) > (m.homeScore ?? 0);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "9px 14px",
      borderBottom: "1px solid #f4f6fa",
    }}>
      {/* Home team */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "flex-end", gap: "6px",
        opacity: hw ? 1 : 0.5,
      }}>
        <span style={{ fontSize: "12px", fontWeight: hw ? 700 : 500, color: hw ? "#0f172a" : "#94a3b8", textAlign: "right" }}>
          {h.name}
        </span>
        <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
      </div>

      {/* Score */}
      <div style={{
        background: "#0f172a", color: "#fff",
        padding: "3px 10px", borderRadius: "7px",
        fontWeight: 900, fontSize: "13px",
        display: "flex", alignItems: "center", gap: "2px",
        flexShrink: 0,
      }}>
        <span style={{ color: hw ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>{m.homeScore}</span>
        <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 2px", fontSize: "11px" }}>–</span>
        <span style={{ color: aw ? "#fbbf24" : "rgba(255,255,255,0.4)" }}>{m.awayScore}</span>
      </div>

      {/* Away team */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", gap: "6px",
        opacity: aw ? 1 : 0.5,
      }}>
        <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
        <span style={{ fontSize: "12px", fontWeight: aw ? 700 : 500, color: aw ? "#0f172a" : "#94a3b8" }}>
          {a.name}
        </span>
      </div>

      {/* Date */}
      <span style={{
        fontSize: "9px", color: "#94a3b8", fontWeight: 600,
        flexShrink: 0, whiteSpace: "nowrap",
      }}>
        {isoToSlash(m.date)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GamesPageV2 — main component
// ─────────────────────────────────────────────────────────────────────────────

export function GamesPageV2() {
  const { tournament, dataSource, teamsById, lastSyncAt, apiStandings } = useApp();

  /* ── Data derivation (same logic as before, no changes) ── */
  const allTeams    = tournament.groups.flatMap(g => g.teams);
  const total       = tournament.matches.length;
  const played      = tournament.matches.filter(m => m.status === "played").length;
  const remaining   = total - played;
  const today       = new Date().toISOString().slice(0, 10);

  const todayMatches = tournament.matches
    .filter(m => m.date === today)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const futureMatches = tournament.matches
    .filter(m => m.date > today && m.status === "unplayed")
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));

  const recentResults = tournament.matches
    .filter(m => m.status === "played")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const futureByDate = new Map<string, Match[]>();
  for (const m of futureMatches) {
    if (!futureByDate.has(m.date)) futureByDate.set(m.date, []);
    futureByDate.get(m.date)!.push(m);
  }

  const src = SRC[dataSource];

  function find(id: string): Team | null {
    return teamsById.get(id) ?? allTeams.find(t => t.id === id) ?? null;
  }

  /* ── Render ── */
  return (
    <div style={{ background: "#f4f6fb", minHeight: "100vh", paddingBottom: "100px" }}>

      {/* ── Page title bar ──────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #edf2f7", padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span style={{ fontSize: "22px" }}>📅</span>
            <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              משחקים
            </h1>
          </div>
          <span style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", borderRadius: "999px",
            fontSize: "11px", fontWeight: 700,
            background: src.bg, color: src.color,
            border: `1px solid ${src.border}`,
          }}>
            {src.dot} {src.label}
          </span>
        </div>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>
          FIFA World Cup 2026 · מונדיאל 2026
        </p>
        <div style={{ height: "3px", width: "28px", borderRadius: "3px", background: "linear-gradient(to right,#0284c7,#38bdf8)", marginTop: "10px" }} />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* ── 3 stat cards ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
          <StatCard
            icon="📅" label="משחקים שהסתיימו"
            value={String(played)} sub={`מתוך ${total}`}
            iconGrad="linear-gradient(135deg,#dbeafe,#bfdbfe)"
          />
          <StatCard
            icon="⚽" label="משחקים שנותרו"
            value={String(remaining)} sub={`מתוך ${total}`}
            iconGrad="linear-gradient(135deg,#d1fae5,#a7f3d0)"
          />
          <StatCard
            icon="🕐" label="עודכן לאחרונה"
            value={lastSyncAt ? fmtDT(lastSyncAt) : "—"} sub="סנכרון נתונים"
            iconGrad="linear-gradient(135deg,#ede9fe,#ddd6fe)"
          />
        </div>

        {/* ── 2-col: Featured group (DOM-1 = visual right) + Today (DOM-2 = visual left) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "14px" }}>

          {/* Featured group table */}
          <FeaturedGroup tournament={tournament} apiStandings={apiStandings} />

          {/* Today's matches */}
          <Card>
            {/* Card header */}
            <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 900, color: "#0f172a", margin: 0 }}>
                    המשחקים של היום
                  </p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
                    {hebDate(today)}
                  </p>
                </div>
              </div>
            </div>

            {/* Match list or empty state */}
            <div style={{ padding: "12px 14px" }}>
              {todayMatches.length === 0 ? (
                <div style={{
                  padding: "36px 20px",
                  display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                  background: "linear-gradient(135deg,#f0f9ff,#e0f2fe 40%,#f0fdf4)",
                  borderRadius: "12px",
                }}>
                  <span style={{ fontSize: "56px", lineHeight: 1, marginBottom: "14px", filter: "drop-shadow(0 4px 12px rgba(2,132,199,0.22))" }}>⚽</span>
                  <p style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>אין משחקים היום</p>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 4px" }}>{hebDate(today)}</p>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>המשחקים הבאים מתחילים בקרוב ↓</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {todayMatches.map(m => (
                    <TodayMatchSubCard key={m.id} m={m} findTeam={find} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer link */}
            <div style={{
              padding: "10px 16px 12px",
              borderTop: "1px solid #f1f5f9",
            }}>
              <button style={{
                fontSize: "12px", fontWeight: 700, color: "#0284c7",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px", padding: 0,
              }}>
                <span>←</span> צפה בכל המשחקים של היום
              </button>
            </div>
          </Card>
        </div>

        {/* ── Upcoming matches ────────────────────────────────────────── */}
        {futureMatches.length > 0 && (
          <div>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <SectionTitle icon="📆" text="משחקים עתידיים" />
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            {/* Date columns grid — show all dates 2-up */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Pair up dates */}
              {Array.from({ length: Math.ceil(Math.min(futureByDate.size, 6) / 2) }, (_, i) => {
                const allDates = [...futureByDate.keys()];
                const d1 = allDates[i * 2];
                const d2 = allDates[i * 2 + 1];
                return (
                  <div key={d1} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {/* DOM first = visual right in RTL */}
                    {d1 && (
                      <DateColumn
                        date={d1}
                        matches={futureByDate.get(d1)!}
                        findTeam={find}
                      />
                    )}
                    {/* DOM second = visual left in RTL */}
                    {d2 && (
                      <DateColumn
                        date={d2}
                        matches={futureByDate.get(d2)!}
                        findTeam={find}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* View all link */}
            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <button style={{
                fontSize: "12px", fontWeight: 700, color: "#0284c7",
                background: "none", border: "1px solid #bae6fd", borderRadius: "999px",
                cursor: "pointer", padding: "7px 18px",
                display: "inline-flex", alignItems: "center", gap: "4px",
              }}>
                <span>←</span> צפה בכל המשחקים העתידיים
              </button>
            </div>
          </div>
        )}

        {/* ── Recent results ───────────────────────────────────────────── */}
        {recentResults.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <SectionTitle icon="✅" text="תוצאות אחרונות" />
              <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            </div>

            <Card>
              {recentResults.map((m, i) => (
                <div key={m.id} style={{ borderBottom: i < recentResults.length - 1 ? "1px solid #f4f6fa" : "none" }}>
                  <ResultRow m={m} findTeam={find} />
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── Data source note ─────────────────────────────────────────── */}
        {dataSource === "openfootball" && (
          <div style={{
            padding: "12px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 500,
            background: "#eff9ff", border: "1px solid #bae6fd", color: "#0284c7",
          }}>
            ℹ️ מקור הנתונים הנוכחי אינו לייב. מוצגים נתונים לפי הסנכרון האחרון.
          </div>
        )}

      </div>
    </div>
  );
}
