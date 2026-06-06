"use client";

import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { FeaturedGroupCard } from "@/components/FeaturedGroupCard";
import type { GroupStanding } from "@/types";

const GROUP_IDS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

const COLORS: Record<string, { grad: string; accent: string; glow: string }> = {
  A: { grad:"linear-gradient(135deg,#38bdf8,#0369a1)", accent:"#0ea5e9", glow:"rgba(14,165,233,.45)" },
  B: { grad:"linear-gradient(135deg,#34d399,#047857)", accent:"#10b981", glow:"rgba(16,185,129,.45)" },
  C: { grad:"linear-gradient(135deg,#c084fc,#7c3aed)", accent:"#a855f7", glow:"rgba(168,85,247,.45)" },
  D: { grad:"linear-gradient(135deg,#fb923c,#c2410c)", accent:"#f97316", glow:"rgba(249,115,22,.45)" },
  E: { grad:"linear-gradient(135deg,#fb7185,#be123c)", accent:"#f43f5e", glow:"rgba(244,63,94,.45)" },
  F: { grad:"linear-gradient(135deg,#22d3ee,#0e7490)", accent:"#06b6d4", glow:"rgba(6,182,212,.45)" },
  G: { grad:"linear-gradient(135deg,#fbbf24,#b45309)", accent:"#f59e0b", glow:"rgba(245,158,11,.45)" },
  H: { grad:"linear-gradient(135deg,#818cf8,#4338ca)", accent:"#6366f1", glow:"rgba(99,102,241,.45)" },
  I: { grad:"linear-gradient(135deg,#2dd4bf,#0f766e)", accent:"#14b8a6", glow:"rgba(20,184,166,.45)" },
  J: { grad:"linear-gradient(135deg,#bef264,#4d7c0f)", accent:"#84cc16", glow:"rgba(132,204,22,.45)" },
  K: { grad:"linear-gradient(135deg,#f472b6,#be185d)", accent:"#ec4899", glow:"rgba(236,72,153,.45)" },
  L: { grad:"linear-gradient(135deg,#60a5fa,#1d4ed8)", accent:"#3b82f6", glow:"rgba(59,130,246,.45)" },
};

type PosStyle = { rowBg: string; borderColor: string; badgeBg: string; badgeText: string };

function posStyle(pos: number): PosStyle {
  if (pos === 1) return { rowBg:"#fffbeb", borderColor:"#f59e0b", badgeBg:"#f59e0b", badgeText:"#fff" };
  if (pos === 2) return { rowBg:"#eff6ff", borderColor:"#3b82f6", badgeBg:"#2563eb", badgeText:"#fff" };
  if (pos === 3) return { rowBg:"#fff7ed", borderColor:"#f97316", badgeBg:"#f97316", badgeText:"#fff" };
  return { rowBg:"#fff", borderColor:"transparent", badgeBg:"#e8eef8", badgeText:"#94a3b8" };
}

function GroupCard({
  group, isActive, onClick, flags,
}: {
  group: string; isActive: boolean; onClick: () => void; flags: string[];
}) {
  const c = COLORS[group];
  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-2xl border-2 transition-all duration-200 active:scale-95"
      style={
        isActive
          ? {
              background: c.grad,
              borderColor: "transparent",
              boxShadow: `0 6px 28px ${c.glow}, 0 2px 8px rgba(0,0,0,.3)`,
              transform: "translateY(-2px)",
            }
          : {
              background: "rgba(255,255,255,.07)",
              borderColor: "rgba(255,255,255,.1)",
              boxShadow: "0 2px 8px rgba(0,0,0,.2)",
            }
      }
    >
      {!isActive && <div className="h-[3px]" style={{ background: c.grad }} />}
      <div className="flex flex-col items-center py-2.5 px-1 gap-1.5">
        <span
          className="text-[22px] font-black leading-none tracking-tight"
          style={{ color: isActive ? "#fff" : c.accent }}
        >
          {group}
        </span>
        {flags.length > 0 && (
          <div className="grid grid-cols-2 gap-[2px]" style={{ fontSize: "11px", lineHeight: 1 }}>
            {flags.slice(0, 4).map((f, i) => (
              <span key={i} className="text-center">{f}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function PosBadge({ pos }: { pos: number }) {
  const s = posStyle(pos);
  return (
    <span
      className="w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black shrink-0"
      style={{ background: s.badgeBg, color: s.badgeText }}
    >
      {pos}
    </span>
  );
}

function StandingsCard({
  standings, accentGrad, accent, fromApi,
}: {
  standings: GroupStanding[]; accentGrad: string; accent: string; fromApi: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 6px 28px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.25)" }}
    >
      {/* Gradient header */}
      <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: accentGrad }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-white text-[10px] font-black opacity-70 uppercase tracking-widest w-6 text-center">#</span>
          <span className="text-white text-xs font-bold uppercase tracking-wider flex-1">נבחרת</span>
        </div>
        <span className="text-white text-[10px] font-bold opacity-80 w-7 text-center">מש׳</span>
        <span className="text-white text-[10px] font-bold opacity-80 w-7 text-center">גב׳</span>
        <span className="text-white text-[10px] font-bold opacity-80 w-8 text-center">הפ</span>
        <span className="text-white text-sm font-black w-8 text-center">נק׳</span>
        {fromApi && (
          <span className="text-[9px] font-bold opacity-70 ml-1" title="API data">🟢</span>
        )}
      </div>

      {/* Rows */}
      <div className="bg-white divide-y divide-[#f1f5fb]">
        {standings.map((s) => {
          const p = posStyle(s.position);
          const gdColor =
            s.goalDifference > 0 ? "#16a34a" :
            s.goalDifference < 0 ? "#dc2626" : "#94a3b8";

          return (
            <div
              key={s.teamId}
              className="flex items-center gap-3 px-3 py-3 transition-colors"
              style={{ background: p.rowBg, borderLeft: `3px solid ${p.borderColor}` }}
            >
              {/* Team info */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <PosBadge pos={s.position} />
                <span className="text-lg leading-none shrink-0">{s.team.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#0f172a] truncate leading-tight">{s.team.name}</p>
                  {s.position <= 3 && (
                    <p className="text-[9px] font-semibold mt-0.5 leading-none" style={{ color: p.borderColor }}>
                      {s.position === 1 ? "מקום 1 — עולה" :
                       s.position === 2 ? "מקום 2 — עולה" :
                       "מקום 3 — פוטנציאל"}
                    </p>
                  )}
                </div>
              </div>

              <span className="w-7 text-center text-xs text-[#94a3b8]">{s.played}</span>
              <span className="w-7 text-center text-xs font-semibold text-[#475569]">{s.goalsFor}</span>
              <span
                className="w-8 text-center text-xs font-bold"
                style={{ color: gdColor }}
              >
                {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
              </span>
              <span
                className="w-8 text-center text-sm font-black"
                style={{ color: accent }}
              >
                {s.points}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 bg-[#fafcff] border-t border-[#eef3ff]">
        <LegendItem color="#f59e0b" label="מקום 1 — עולה ישיר" />
        <LegendItem color="#3b82f6" label="מקום 2 — עולה ישיר" />
        <LegendItem color="#f97316" label="מקום 3 — מועמד ל-8 הטובים" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
      <span className="text-[9px] text-[#94a3b8] font-medium">{label}</span>
    </div>
  );
}

export function GroupsPage() {
  const { tournament, apiStandings } = useApp();
  const [activeGroup, setActiveGroup] = useState<string>("A");

  const localGroupedStandings = tournament.standings.reduce(
    (acc, s) => {
      if (!acc[s.groupId]) acc[s.groupId] = [];
      acc[s.groupId].push(s);
      return acc;
    },
    {} as Record<string, typeof tournament.standings>
  );

  const apiGroupedStandings = (apiStandings ?? []).reduce(
    (acc, s) => {
      if (!acc[s.groupId]) acc[s.groupId] = [];
      acc[s.groupId].push(s);
      return acc;
    },
    {} as Record<string, GroupStanding[]>
  );

  const groupFlags: Record<string, string[]> = {};
  GROUP_IDS.forEach((g) => {
    const source = apiGroupedStandings[g]?.length ? apiGroupedStandings[g] : (localGroupedStandings[g] ?? []);
    groupFlags[g] = source.map((s) => s.team.flag);
  });

  const apiForGroup  = apiGroupedStandings[activeGroup] ?? [];
  const localForGroup = localGroupedStandings[activeGroup] ?? [];
  const standings   = apiForGroup.length > 0 ? apiForGroup : localForGroup;
  const fromApi     = apiForGroup.length > 0;

  const activeColor = COLORS[activeGroup];

  return (
    <div className="pb-[80px]">
      {/* Page header */}
      <div className="page-section-header px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl">⚽</span>
          <h1 className="text-2xl font-black text-white tracking-tight">בתים</h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(147,197,253,.5)" }}>
          FIFA World Cup 2026 · 12 בתים
        </p>
        <div className="title-bar mt-2" />
      </div>

      {/* Group selector grid — 4 × 3 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {GROUP_IDS.map((g) => (
            <GroupCard
              key={g}
              group={g}
              isActive={activeGroup === g}
              onClick={() => setActiveGroup(g)}
              flags={groupFlags[g]}
            />
          ))}
        </div>
      </div>

      {/* Selected group content */}
      <div className="px-4 space-y-4">
        {/* Group label row */}
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-8 rounded-full shrink-0"
            style={{ background: activeColor.grad }}
          />
          <div>
            <p className="text-base font-black text-white leading-tight">בית {activeGroup}</p>
            {standings[0] && (
              <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,.45)" }}>
                {standings[0].played}/3 מחזורים
              </p>
            )}
          </div>
        </div>

        {standings.length > 0 ? (
          <FeaturedGroupCard
            groupId={activeGroup}
            standings={standings}
            accentGrad={activeColor.grad}
            accent={activeColor.accent}
            fromApi={fromApi}
          />
        ) : (
          <div className="wc-card p-8 text-center text-[#94a3b8]">אין נתונים לבית זה</div>
        )}

        {/* Match results — always from local tournament state */}
        <GroupResults
          groupId={activeGroup}
          accentGrad={activeColor.grad}
          accent={activeColor.accent}
        />
      </div>
    </div>
  );
}

function GroupResults({
  groupId, accentGrad, accent,
}: {
  groupId: string; accentGrad: string; accent: string;
}) {
  const { tournament } = useApp();
  const allTeams = tournament.groups.flatMap((g) => g.teams);
  const played = tournament.matches.filter(
    (m) => m.groupId === groupId && m.status === "played"
  );
  const upcoming = tournament.matches.filter(
    (m) => m.groupId === groupId && m.status === "unplayed"
  );

  if (played.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="space-y-4 pb-2">
      {played.length > 0 && (
        <div>
          <p className="sec-label mb-2">תוצאות</p>
          <div className="space-y-2">
            {played.map((m) => {
              const h = allTeams.find((t) => t.id === m.homeTeamId);
              const a = allTeams.find((t) => t.id === m.awayTeamId);
              if (!h || !a) return null;
              const homeWon = (m.homeScore ?? 0) > (m.awayScore ?? 0);
              const awayWon = (m.awayScore ?? 0) > (m.homeScore ?? 0);
              return (
                <div key={m.id} className="wc-card-sm flex items-center gap-2 px-3 py-2.5">
                  <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${homeWon ? "" : "opacity-60"}`}>
                    <span className="text-base leading-none shrink-0">{h.flag}</span>
                    <span className={`text-sm font-semibold truncate ${homeWon ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
                      {h.name}
                    </span>
                  </div>
                  <div
                    className="score-pill shrink-0"
                    style={{ background: accentGrad }}
                  >
                    <span style={{ opacity: homeWon ? 1 : .6 }}>{m.homeScore}</span>
                    <span className="mx-1 opacity-60">–</span>
                    <span style={{ opacity: awayWon ? 1 : .6 }}>{m.awayScore}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 flex-1 min-w-0 justify-end ${awayWon ? "" : "opacity-60"}`} dir="ltr">
                    <span className={`text-sm font-semibold truncate text-right ${awayWon ? "text-[#0f172a]" : "text-[#94a3b8]"}`}>
                      {a.name}
                    </span>
                    <span className="text-base leading-none shrink-0">{a.flag}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="sec-label mb-2">
            משחקים עתידיים — מחזור {upcoming[0]?.matchDay}
          </p>
          <div className="space-y-2">
            {upcoming.map((m) => {
              const h = allTeams.find((t) => t.id === m.homeTeamId);
              const a = allTeams.find((t) => t.id === m.awayTeamId);
              if (!h || !a) return null;
              return (
                <div key={m.id} className="wc-card-sm flex items-center gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-base leading-none shrink-0">{h.flag}</span>
                    <span className="text-sm font-semibold truncate text-[#475569]">{h.name}</span>
                  </div>
                  <span
                    className="text-xs font-black px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    vs
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end" dir="ltr">
                    <span className="text-sm font-semibold truncate text-[#475569] text-right">{a.name}</span>
                    <span className="text-base leading-none shrink-0">{a.flag}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
