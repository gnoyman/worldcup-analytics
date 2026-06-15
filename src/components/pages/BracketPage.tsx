"use client";

import { useState } from "react";
import { useApp } from "@/components/AppContext";
import type { KnockoutMatch } from "@/types";
import { RoadToFinal } from "@/components/pages/RoadToFinal";
import { slotLabelHebrew } from "@/engine/knockout/knockout";
import { SlotLabel } from "@/components/SlotLabel";

// ── Feeder label (recursive) ──────────────────────────────────────────────────

function resolveLabel(
  matchId: string,
  slot: "home" | "away",
  all: KnockoutMatch[],
  depth = 0
): string {
  if (depth > 4) return "…";
  const feeder = all.find((m) => m.nextMatchId === matchId && m.nextSlot === slot);
  if (!feeder) return "—";
  const homeStr = feeder.homeTeam?.team.name
    ?? (feeder.homeSlot ? slotLabelHebrew(feeder.homeSlot) : resolveLabel(feeder.id, "home", all, depth + 1));
  const awayStr = feeder.awayTeam?.team.name
    ?? (feeder.awaySlot ? slotLabelHebrew(feeder.awaySlot) : resolveLabel(feeder.id, "away", all, depth + 1));
  return `מנצח ${homeStr} / ${awayStr}`;
}

// ── Stage meta ────────────────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "Round of 32":  { label: "שלב 32",      color: "#0ea5e9", bg: "rgba(14,165,233,.12)", icon: "⚽" },
  "Round of 16":  { label: "שמינית גמר",  color: "#8b5cf6", bg: "rgba(139,92,246,.12)", icon: "🎯" },
  "Quarterfinal": { label: "רביע גמר",    color: "#f97316", bg: "rgba(249,115,22,.12)", icon: "🏅" },
  "Semifinal":    { label: "חצי גמר",     color: "#10b981", bg: "rgba(16,185,129,.12)", icon: "🌟" },
  "Final":        { label: "גמר",         color: "#f59e0b", bg: "rgba(245,158,11,.12)", icon: "🏆" },
};

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  allMatches,
  stageColor,
}: {
  match: KnockoutMatch;
  allMatches: KnockoutMatch[];
  stageColor: string;
}) {
  const homeTBD = !match.homeTeam;
  const awayTBD = !match.awayTeam;
  const bothTBD = homeTBD && awayTBD;
  const homeWon = !!match.winner && match.winner === match.homeTeam?.teamId;
  const awayWon = !!match.winner && match.winner === match.awayTeam?.teamId;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid rgba(255,255,255,.08)",
        borderLeft: `4px solid ${stageColor}`,
        boxShadow: "0 4px 20px rgba(0,0,0,.35), 0 1px 6px rgba(0,0,0,.2)",
      }}
    >
      {/* Home row */}
      <div
        className="flex items-center gap-2.5 px-3 py-3"
        style={{ background: homeWon ? `${stageColor}12` : "transparent" }}
      >
        {match.homeTeam ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl leading-none shrink-0">{match.homeTeam.team.flag}</span>
            <span
              className="flex-1 truncate text-sm"
              style={{ fontWeight: homeWon ? 700 : 500, color: homeWon ? "#0f172a" : "#475569" }}
            >
              {match.homeTeam.team.name}
            </span>
            {match.homeScore !== undefined && (
              <span
                className="font-black text-lg tabular-nums w-7 text-center shrink-0"
                style={{ color: homeWon ? stageColor : "#94a3b8" }}
              >
                {match.homeScore}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: `${stageColor}15`, color: stageColor, border: `1px solid ${stageColor}35` }}
            >
              ממתין
            </span>
            <span className="text-xs text-[#64748b] flex-1 min-w-0 truncate leading-snug">
              {match.homeSlot
                ? <SlotLabel slot={match.homeSlot} />
                : resolveLabel(match.id, "home", allMatches)}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      {bothTBD ? (
        <div className="flex items-center gap-2 px-4 py-1">
          <div className="flex-1 h-px" style={{ background: "#e8eef8" }} />
          <span className="text-[8px] font-black text-[#cbd5e1] uppercase tracking-widest">נגד</span>
          <div className="flex-1 h-px" style={{ background: "#e8eef8" }} />
        </div>
      ) : (
        <div className="mx-3 h-px" style={{ background: "#f0f6ff" }} />
      )}

      {/* Away row */}
      <div
        className="flex items-center gap-2.5 px-3 py-3"
        style={{ background: awayWon ? `${stageColor}12` : "transparent" }}
      >
        {match.awayTeam ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl leading-none shrink-0">{match.awayTeam.team.flag}</span>
            <span
              className="flex-1 truncate text-sm"
              style={{ fontWeight: awayWon ? 700 : 500, color: awayWon ? "#0f172a" : "#475569" }}
            >
              {match.awayTeam.team.name}
            </span>
            {match.awayScore !== undefined && (
              <span
                className="font-black text-lg tabular-nums w-7 text-center shrink-0"
                style={{ color: awayWon ? stageColor : "#94a3b8" }}
              >
                {match.awayScore}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: `${stageColor}15`, color: stageColor, border: `1px solid ${stageColor}35` }}
            >
              ממתין
            </span>
            <span className="text-xs text-[#64748b] flex-1 min-w-0 truncate leading-snug">
              {match.awaySlot
                ? <SlotLabel slot={match.awaySlot} />
                : resolveLabel(match.id, "away", allMatches)}
            </span>
          </div>
        )}
      </div>

      {/* Finished badge */}
      {match.status === "played" && match.winner && (
        <div
          className="text-center text-[10px] font-bold py-1.5"
          style={{
            background: `${stageColor}12`,
            borderTop: `1px solid ${stageColor}25`,
            color: stageColor,
          }}
        >
          ✓ הסתיים
        </div>
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function BracketList() {
  const { tournament } = useApp();
  const allMatches = tournament.knockoutBracket.matches;
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const matchesByStage = allMatches.reduce(
    (acc, m) => {
      if (!acc[m.stage]) acc[m.stage] = [];
      acc[m.stage].push(m);
      return acc;
    },
    {} as Record<string, KnockoutMatch[]>
  );

  const stages = ["Round of 32","Round of 16","Quarterfinal","Semifinal","Final"] as const;
  const visibleStages = activeStage ? stages.filter(s => s === activeStage) : stages;

  return (
    <div className="space-y-6">

      {/* ── Stage filter pills ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveStage(null)}
          className="text-[10px] font-black px-3 py-1.5 rounded-full transition-all"
          style={activeStage === null
            ? { background: "#0f172a", color: "#fff" }
            : { background: "#f1f5f9", color: "#64748b" }}
        >
          הכל
        </button>
        {stages.map(stage => {
          const meta  = STAGE_META[stage];
          const total = matchesByStage[stage]?.length ?? 0;
          if (total === 0) return null;
          const played   = matchesByStage[stage]?.filter(m => m.status === "played").length ?? 0;
          const isActive = activeStage === stage;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(isActive ? null : stage)}
              className="text-[10px] font-black px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
              style={isActive
                ? { background: meta.color, color: "#fff" }
                : { background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
            >
              {meta.icon} {meta.label}
              <span style={{ opacity: 0.65 }}>·</span>
              <span>{played}/{total}</span>
            </button>
          );
        })}
      </div>

      {/* ── Stage groups ────────────────────────────────────────────────── */}
      {visibleStages.map((stage) => {
        const matches = matchesByStage[stage] ?? [];
        if (matches.length === 0) return null;
        const meta   = STAGE_META[stage];
        const played = matches.filter(m => m.status === "played").length;

        return (
          <div key={stage}>
            {/* Stage header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1" style={{ background: `${meta.color}30` }} />
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-xs font-black px-4 py-1.5 rounded-full"
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    border: `1px solid ${meta.color}40`,
                    boxShadow: `0 0 12px ${meta.color}25`,
                  }}
                >
                  {meta.icon} {meta.label}
                </span>
                <span className="text-[9px] font-bold" style={{ color: "#94a3b8" }}>
                  {played}/{matches.length} הסתיימו
                </span>
              </div>
              <div className="h-px flex-1" style={{ background: `${meta.color}30` }} />
            </div>

            <div className="grid gap-3 grid-cols-1">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  allMatches={allMatches}
                  stageColor={meta.color}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type View = "list" | "tree";

export function BracketPage() {
  const [view, setView] = useState<View>("list");

  return (
    <div className="pb-[80px]">
      {/* Hero */}
      <div className="page-section-header px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl">🏆</span>
          <h1 className="text-2xl font-black text-white tracking-tight">הצלבות</h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(147,197,253,.5)" }}>
          FIFA World Cup 2026 · שלב הנוקאאוט
        </p>
        <div className="title-bar mt-2" />
      </div>

      <div className="px-4 pt-4">
        {/* View toggle */}
        <div className="tab-switcher mb-5">
          {(["list","tree"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`tab-btn ${view === v ? "tab-btn-active" : ""}`}
            >
              {v === "list" ? "רשימה" : "עץ הטורניר"}
            </button>
          ))}
        </div>

        {view === "list" && <BracketList />}
      </div>

      {view === "tree" && <RoadToFinal />}
    </div>
  );
}
