"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/components/AppContext";
import { calculateTeamProbabilities } from "@/engine/probabilities/probabilities";
import type { KnockoutTeam, TeamProbabilities } from "@/types";

// ── Group accent gradients ─────────────────────────────────────────────────────

const GROUP_GRADIENT: Record<string, string> = {
  A: "linear-gradient(135deg,#0c4a6e,#0ea5e9)",
  B: "linear-gradient(135deg,#064e3b,#10b981)",
  C: "linear-gradient(135deg,#4c1d95,#8b5cf6)",
  D: "linear-gradient(135deg,#7c2d12,#f97316)",
  E: "linear-gradient(135deg,#881337,#f43f5e)",
  F: "linear-gradient(135deg,#164e63,#06b6d4)",
  G: "linear-gradient(135deg,#78350f,#f59e0b)",
  H: "linear-gradient(135deg,#312e81,#6366f1)",
  I: "linear-gradient(135deg,#134e4a,#14b8a6)",
  J: "linear-gradient(135deg,#365314,#65a30d)",
  K: "linear-gradient(135deg,#831843,#ec4899)",
  L: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
};

// ── Position badge ─────────────────────────────────────────────────────────────

function PositionBadge({ position }: { position: number }) {
  const s =
    position === 1 ? { bg: "rgba(251,191,36,.22)",  text: "#fbbf24", label: "ראשון בבית"  } :
    position === 2 ? { bg: "rgba(147,197,253,.22)",  text: "#93c5fd", label: "שני בבית"    } :
    position === 3 ? { bg: "rgba(253,186,116,.22)",  text: "#fdba74", label: "שלישי בבית"  } :
                     { bg: "rgba(255,255,255,.1)",   text: "rgba(255,255,255,.5)", label: "רביעי בבית" };
  return (
    <span
      className="text-[10px] font-black px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ── Probability bar row ───────────────────────────────────────────────────────

function ProbBar({
  label, icon, value, color, gradient,
}: {
  label: string; icon: string; value: number; color: string; gradient: string;
}) {
  const pct = `${Math.round(value * 100)}%`;
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] font-black shrink-0 w-6 h-5 flex items-center justify-center rounded"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-semibold text-[#475569] flex-1 text-right">
        {label}
      </span>
      <div className="w-28 h-2 rounded-full bg-[#e8eef8] overflow-hidden shrink-0">
        <div
          className="h-full rounded-full"
          style={{ width: pct, background: gradient }}
        />
      </div>
      <span
        className="text-[10px] font-black w-8 text-left shrink-0"
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}

// ── Route bubble chain ────────────────────────────────────────────────────────

function RouteBubbles({ probs }: { probs: TeamProbabilities }) {
  const stages = [
    { short: "בית", value: probs.qualifyFromGroup,   color: "#10b981" },
    { short: "32",  value: probs.qualifyFromGroup,   color: "#0ea5e9" },
    { short: "16",  value: probs.reachRound16,       color: "#8b5cf6" },
    { short: "רב",  value: probs.reachQuarterfinal,  color: "#f97316" },
    { short: "חצ",  value: probs.reachSemifinal,     color: "#f43f5e" },
    { short: "ג",   value: probs.reachFinal,         color: "#f59e0b" },
    { short: "🏆",  value: probs.winTournament,      color: "#d97706" },
  ];

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1" dir="ltr">
      {stages.map((s, i) => {
        const filled = s.value > 0.5;
        return (
          <div key={i} className="flex items-center gap-0.5 shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-bold" style={{ color: s.color }}>
                {Math.round(s.value * 100)}%
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{
                  background: filled ? s.color : `${s.color}15`,
                  color: filled ? "#fff" : s.color,
                  border: `2px solid ${s.color}${filled ? "" : "55"}`,
                }}
              >
                {s.short}
              </div>
            </div>
            {i < stages.length - 1 && (
              <span
                className="text-lg font-black leading-none shrink-0 mt-4"
                style={{ color: "#c7d8f5" }}
              >
                ›
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeamPage() {
  const { tournament } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const allTeams     = tournament.groups.flatMap((g) => g.teams);
  const selectedTeam = selectedTeamId ? allTeams.find((t) => t.id === selectedTeamId) : null;
  const teamStanding = selectedTeamId
    ? tournament.standings.find((s) => s.teamId === selectedTeamId)
    : null;

  const qualifyingInfo = selectedTeamId && teamStanding
    ? {
        position: teamStanding.position,
        group:    teamStanding.groupId,
        points:   teamStanding.points,
        gd:       teamStanding.goalDifference,
        played:   teamStanding.played,
        wins:     teamStanding.wins,
        draws:    teamStanding.draws,
        losses:   teamStanding.losses,
        qualified:
          teamStanding.position === 1 ||
          teamStanding.position === 2 ||
          (teamStanding.position === 3 &&
            tournament.thirdPlaceTeams.some((t) => t.teamId === selectedTeamId)),
      }
    : null;

  const probs = useMemo<TeamProbabilities | null>(
    () =>
      selectedTeam
        ? calculateTeamProbabilities(
            selectedTeam,
            tournament.standings,
            tournament.groups
          )
        : null,
    [selectedTeam, tournament.standings, tournament.groups]
  );

  const r32Opponent = useMemo<KnockoutTeam | null>(() => {
    if (!selectedTeamId) return null;
    const r32 = tournament.knockoutBracket.matches.find(
      (m) =>
        m.stage === "Round of 32" &&
        (m.homeTeam?.teamId === selectedTeamId ||
          m.awayTeam?.teamId === selectedTeamId)
    );
    if (!r32) return null;
    return (
      (r32.homeTeam?.teamId === selectedTeamId ? r32.awayTeam : r32.homeTeam) ?? null
    );
  }, [selectedTeamId, tournament.knockoutBracket.matches]);

  const heroGradient = qualifyingInfo
    ? (GROUP_GRADIENT[qualifyingInfo.group] ?? "linear-gradient(135deg,#1e40af,#0284c7)")
    : "linear-gradient(135deg,#1e40af,#7c3aed)";

  return (
    <div className="pb-[80px]">
      {/* ── Team picker ──────────────────────────────────────────────── */}
      <div className="page-section-header px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl">👕</span>
          <h1 className="text-2xl font-black text-white tracking-tight">נבחרת</h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(147,197,253,.5)" }}>
          FIFA World Cup 2026 · 48 נבחרות
        </p>
        <div className="title-bar mt-2 mb-3" />
        <div className="flex flex-wrap gap-1.5">
          {allTeams.map((team) => {
            const isActive = selectedTeamId === team.id;
            return (
              <button
                key={team.id}
                onClick={() =>
                  setSelectedTeamId(selectedTeamId === team.id ? null : team.id)
                }
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={
                  isActive
                    ? {
                        background: "#f59e0b",
                        color: "#fff",
                        boxShadow: "0 2px 10px rgba(245,158,11,.5)",
                      }
                    : {
                        background: "rgba(255,255,255,.08)",
                        border: "1px solid rgba(255,255,255,.12)",
                        color: "rgba(255,255,255,.7)",
                      }
                }
              >
                <span className="text-sm leading-none">{team.flag}</span>
                <span>{team.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4">
        {selectedTeam && qualifyingInfo && probs ? (
          <div className="space-y-3">

            {/* ── Hero card ─────────────────────────────────────────────── */}
            <div
              className="rounded-3xl overflow-hidden relative"
              style={{ background: heroGradient, minHeight: 176, boxShadow: "0 8px 32px rgba(0,0,0,.45)" }}
            >
              {/* Flag background fill */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                aria-hidden
              >
                <span
                  className="leading-none"
                  style={{ fontSize: "240px", opacity: 0.28, transform: "rotate(-6deg)" }}
                >
                  {selectedTeam.flag}
                </span>
              </div>
              {/* Readability overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.2) 50%, rgba(0,0,0,.6) 100%)",
                }}
                aria-hidden
              />

              <div className="relative p-5">
                {/* Top: flag + points */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-6xl leading-none drop-shadow-lg">{selectedTeam.flag}</span>
                  <div className="text-left">
                    <div className="text-4xl font-black text-[#fbbf24] leading-none" style={{ textShadow: "0 0 20px rgba(251,191,36,.5)" }}>
                      {qualifyingInfo.points}
                    </div>
                    <div className="text-[8px] text-white/55 font-bold uppercase tracking-wider mt-0.5">
                      נקודות
                    </div>
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-[24px] font-black text-white leading-tight drop-shadow-md">
                  {selectedTeam.name}
                </h2>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}
                  >
                    בית {qualifyingInfo.group}
                  </span>
                  <PositionBadge position={qualifyingInfo.position} />
                  <span className="text-[10px] font-semibold text-white/50">
                    דירוג {selectedTeam.strengthRating}
                  </span>
                </div>

                {/* Strength bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.15)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedTeam.strengthRating}%`,
                      background: "linear-gradient(to right,#fbbf24,#f97316)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── Stats row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "נצחונות", value: qualifyingInfo.wins,   color: "#16a34a", bg: "#f0fdf4" },
                { label: "תיקו",   value: qualifyingInfo.draws,   color: "#0284c7", bg: "#eff9ff" },
                { label: "הפסדים", value: qualifyingInfo.losses,  color: "#dc2626", bg: "#fff1f2" },
                {
                  label: "הפרש",
                  value: qualifyingInfo.gd > 0 ? `+${qualifyingInfo.gd}` : qualifyingInfo.gd,
                  color: qualifyingInfo.gd >= 0 ? "#16a34a" : "#dc2626",
                  bg:    qualifyingInfo.gd >= 0 ? "#f0fdf4"  : "#fff1f2",
                },
              ].map(({ label, value, color, bg }) => (
                <div
                  key={label}
                  className="text-center py-3 px-1 rounded-xl"
                  style={{
                    background: bg,
                    border: `1px solid ${color}20`,
                    boxShadow: "0 2px 10px rgba(0,0,0,.25)",
                  }}
                >
                  <div className="text-xl font-black" style={{ color }}>{value}</div>
                  <div className="text-[8px] font-bold text-[#94a3b8] uppercase tracking-wide mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Qualification banner ──────────────────────────────────── */}
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={
                qualifyingInfo.qualified
                  ? { background: "#f0fdf4", border: "1.5px solid #86efac", boxShadow: "0 2px 10px rgba(0,0,0,.2)" }
                  : { background: "#fff1f2", border: "1.5px solid #fca5a5", boxShadow: "0 2px 10px rgba(0,0,0,.2)" }
              }
            >
              <span className="text-xl shrink-0">
                {qualifyingInfo.qualified ? "✅" : "❌"}
              </span>
              <div>
                <p className="font-black text-sm text-[#0f172a]">
                  {qualifyingInfo.qualified ? "זכאית להמשך" : "לא זכאית עדיין"}
                </p>
                <p className="text-xs text-[#475569] mt-0.5">
                  {qualifyingInfo.qualified
                    ? qualifyingInfo.position <= 2
                      ? "עוברת ישירות לשלב 32"
                      : "זכאית כצד שלישי מהבתים"
                    : "תוצאות נוספות נדרשות להעפלה"}
                </p>
              </div>
            </div>

            {/* ── Probability bars ──────────────────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 4px 20px rgba(0,0,0,.35)" }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: "#fafcff", borderBottom: "1px solid #eef3ff" }}
              >
                <div
                  className="w-1 h-5 rounded-full shrink-0"
                  style={{ background: "linear-gradient(to bottom,#10b981,#d97706)" }}
                />
                <p className="font-black text-sm text-[#0f172a]">הסתברויות התקדמות</p>
              </div>

              <div className="px-4 py-4 space-y-3 bg-white">
                <ProbBar label="עוברת בית"   icon="✓"  value={probs.qualifyFromGroup} color="#10b981" gradient="linear-gradient(to right,#059669,#34d399)" />
                <ProbBar label="שלב 32"    icon="32" value={probs.qualifyFromGroup} color="#0ea5e9" gradient="linear-gradient(to right,#0369a1,#38bdf8)" />
                <ProbBar label="שמינית גמר" icon="16" value={probs.reachRound16}    color="#8b5cf6" gradient="linear-gradient(to right,#7c3aed,#a78bfa)" />
                <ProbBar label="רביע גמר"  icon="QF" value={probs.reachQuarterfinal} color="#f97316" gradient="linear-gradient(to right,#c2410c,#fb923c)" />
                <ProbBar label="חצי גמר"   icon="SF" value={probs.reachSemifinal}  color="#f43f5e" gradient="linear-gradient(to right,#be123c,#fb7185)" />
                <ProbBar label="גמר"      icon="F"  value={probs.reachFinal}       color="#f59e0b" gradient="linear-gradient(to right,#b45309,#fbbf24)" />
                <ProbBar label="אלוף"     icon="★"  value={probs.winTournament}    color="#d97706" gradient="linear-gradient(to right,#92400e,#fcd34d)" />
              </div>
            </div>

            {/* ── Route visualization ───────────────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 2px 12px rgba(0,0,0,.3)" }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ background: "#fafcff", borderBottom: "1px solid #eef3ff" }}
              >
                <p className="text-xs font-black text-[#0f172a]">מסלול בטורניר</p>
                <span className="text-[9px] text-[#94a3b8] font-medium">· עיגול מלא = מעל 50%</span>
              </div>
              <div className="px-4 py-4 bg-white">
                <RouteBubbles probs={probs} />
              </div>
            </div>

            {/* ── R32 Opponent ──────────────────────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 4px 20px rgba(0,0,0,.35)" }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2.5 px-4 py-2.5"
                style={{ background: "#f0f9ff", borderBottom: "1px solid #bae6fd" }}
              >
                <span
                  className="text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "#0ea5e9", color: "#fff" }}
                >
                  שלב 32
                </span>
                <span className="text-xs font-bold text-[#0369a1]">מחזיק ראשון</span>
              </div>

              {r32Opponent ? (
                <div className="p-4 bg-white">
                  {/* Head-to-head */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-5xl leading-none">{selectedTeam.flag}</span>
                      <p className="text-[9px] font-bold text-[#0f172a] text-center leading-tight truncate max-w-[70px]">{selectedTeam.name}</p>
                      <p className="text-sm font-black" style={{ color: "#0284c7" }}>
                        {selectedTeam.strengthRating}
                      </p>
                    </div>

                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#f1f5f9" }}
                    >
                      <span className="text-[10px] font-black text-[#64748b]">VS</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-5xl leading-none">{r32Opponent.team.flag}</span>
                      <p className="text-[9px] font-bold text-[#0f172a] text-center leading-tight truncate max-w-[70px]">{r32Opponent.team.name}</p>
                      <p
                        className="text-sm font-black"
                        style={{
                          color:
                            r32Opponent.team.strengthRating > selectedTeam.strengthRating
                              ? "#dc2626"
                              : "#94a3b8",
                        }}
                      >
                        {r32Opponent.team.strengthRating}
                      </p>
                    </div>
                  </div>

                  {/* Opponent origin */}
                  <p className="text-[11px] text-center text-[#94a3b8] font-medium mb-3">
                    {r32Opponent.position === "1st" ? "ראשון" :
                     r32Opponent.position === "2nd" ? "שני" : "שלישי"}
                    {" "}מבית {r32Opponent.fromGroup}
                  </p>

                  {/* Strength comparison */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold text-[#94a3b8]">
                      <span className="truncate max-w-[40%]">{selectedTeam.name}</span>
                      <span className="shrink-0 px-1">השוואת כוח</span>
                      <span className="truncate max-w-[40%] text-left">{r32Opponent.team.name}</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden gap-px">
                      <div
                        className="rounded-r-full"
                        style={{
                          flex: selectedTeam.strengthRating,
                          background: "linear-gradient(to left,#0284c7,#38bdf8)",
                        }}
                      />
                      <div
                        className="rounded-l-full"
                        style={{
                          flex: r32Opponent.team.strengthRating,
                          background: "linear-gradient(to right,#dc2626,#f87171)",
                        }}
                      />
                    </div>
                    <div className="text-center pt-0.5">
                      {selectedTeam.strengthRating > r32Opponent.team.strengthRating ? (
                        <span className="text-[11px] font-bold text-[#16a34a]">
                          יתרון לנבחרת ✓
                        </span>
                      ) : selectedTeam.strengthRating < r32Opponent.team.strengthRating ? (
                        <span className="text-[11px] font-bold text-[#dc2626]">
                          יתרון ליריב
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#94a3b8]">
                          כוחות שקולים
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white text-sm text-[#94a3b8]">
                  {qualifyingInfo.qualified
                    ? "הסוגר טרם עודכן"
                    : "הנבחרת לא מעפילה לשלב הנוקאאוט"}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="wc-card p-12 text-center">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-sm font-semibold text-[#475569]">
              בחר נבחרת כדי לראות את דרכה בטורניר
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
