"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/components/AppContext";
import type { Match, Team } from "@/types";

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

// ── Team match card ───────────────────────────────────────────────────────────

function TeamMatchCard({
  match,
  teamId,
  teamsById,
}: {
  match: Match;
  teamId: string;
  teamsById: Map<string, Team>;
}) {
  const isHome   = match.homeTeamId === teamId;
  const oppId    = isHome ? match.awayTeamId : match.homeTeamId;
  const opponent = teamsById.get(oppId);
  const myScore  = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  const played   = match.status === "played" && myScore !== undefined && oppScore !== undefined;

  let resultColor = "#94a3b8";
  let resultLabel = "–";
  if (played) {
    if (myScore! > oppScore!)      { resultColor = "#16a34a"; resultLabel = "W"; }
    else if (myScore! < oppScore!) { resultColor = "#dc2626"; resultLabel = "L"; }
    else                           { resultColor = "#0284c7"; resultLabel = "D"; }
  }

  const dateDisplay = match.date ? match.date.slice(5).replace("-", ".") : "";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{ background: "#f8fafc", border: "1px solid #e8eef8" }}
    >
      <span
        className="text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${resultColor}18`, color: resultColor, border: `1px solid ${resultColor}30` }}
      >
        {resultLabel}
      </span>
      <span className="text-[10px] font-bold text-[#94a3b8] shrink-0 w-9">
        {dateDisplay}
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base leading-none shrink-0">{opponent?.flag ?? "🏳"}</span>
        <span className="text-sm font-semibold text-[#0f172a] truncate">
          {opponent?.name ?? oppId.toUpperCase()}
        </span>
      </div>
      {played ? (
        <span className="text-sm font-black text-[#0f172a] shrink-0 tabular-nums">
          {myScore}:{oppScore}
        </span>
      ) : (
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] font-bold text-[#64748b]">
            {match.time ?? dateDisplay}
          </span>
          {match.venue && (
            <span className="text-[9px] text-[#94a3b8] max-w-[80px] truncate text-right">
              📍 {match.venue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeamPage() {
  const { tournament, apiStandings, teamsById } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Team picker list: ordered from FDO standings (group A→L, position 1→4)
  const allTeams = useMemo(() => {
    if (!apiStandings || apiStandings.length === 0) return [];
    return [...apiStandings]
      .sort((a, b) => a.groupId.localeCompare(b.groupId) || a.position - b.position)
      .map(s => s.team);
  }, [apiStandings]);

  // Resolve selected team from the shared teams map (holds Hebrew names + flags)
  const selectedTeam = useMemo(
    () => (selectedTeamId ? (teamsById.get(selectedTeamId) ?? null) : null),
    [selectedTeamId, teamsById]
  );

  // Standings: FDO only — no mock fallback
  const teamStanding = selectedTeamId
    ? ((apiStandings ?? []).find(s => s.teamId === selectedTeamId) ?? null)
    : null;

  // Top-8 third-place qualifiers from FDO standings only
  const thirdPlaceQualified = useMemo(() => {
    if (!apiStandings || apiStandings.length === 0) return new Set<string>();
    const thirds = apiStandings.filter(s => s.position === 3);
    const sorted = [...thirds].sort((a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
    );
    return new Set(sorted.slice(0, 8).map(s => s.teamId));
  }, [apiStandings]);

  const qualifyingInfo = selectedTeamId && teamStanding
    ? {
        position:    teamStanding.position,
        group:       teamStanding.groupId,
        points:      teamStanding.points,
        gd:          teamStanding.goalDifference,
        goalsFor:    teamStanding.goalsFor,
        goalsAgainst: teamStanding.goalsAgainst,
        played:      teamStanding.played,
        wins:        teamStanding.wins,
        draws:       teamStanding.draws,
        losses:      teamStanding.losses,
        qualified:
          teamStanding.position === 1 ||
          teamStanding.position === 2 ||
          (teamStanding.position === 3 && thirdPlaceQualified.has(selectedTeamId)),
      }
    : null;

  // Team's group-stage matches from the live fixtures (groupId !== "KO")
  const teamMatches = useMemo(() => {
    if (!selectedTeamId) return [];
    return tournament.matches
      .filter(m =>
        m.groupId !== "KO" &&
        (m.homeTeamId === selectedTeamId || m.awayTeamId === selectedTeamId)
      )
      .sort((a, b) => a.matchDay - b.matchDay || a.date.localeCompare(b.date));
  }, [selectedTeamId, tournament.matches]);

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
        {selectedTeam && qualifyingInfo ? (
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
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "נצחונות", value: qualifyingInfo.wins,   color: "#16a34a", bg: "#f0fdf4" },
                { label: "תיקו",   value: qualifyingInfo.draws,   color: "#0284c7", bg: "#eff9ff" },
                { label: "הפסדים", value: qualifyingInfo.losses,  color: "#dc2626", bg: "#fff1f2" },
                { label: "שערים", value: qualifyingInfo.goalsFor,  color: "#059669", bg: "#ecfdf5" },
                { label: "ספג",    value: qualifyingInfo.goalsAgainst, color: "#9333ea", bg: "#faf5ff" },
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

            {/* ── Group-stage matches ───────────────────────────────────── */}
            {teamMatches.length > 0 && (
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
                    style={{ background: "linear-gradient(to bottom,#0ea5e9,#8b5cf6)" }}
                  />
                  <p className="font-black text-sm text-[#0f172a]">משחקי הבית</p>
                  <span className="text-[10px] text-[#94a3b8] font-medium" style={{ marginRight: "auto" }}>
                    {qualifyingInfo.played}/{teamMatches.length} הסתיימו
                  </span>
                </div>
                <div className="p-3 space-y-2 bg-white">
                  {teamMatches.map(m => (
                    <TeamMatchCard
                      key={m.id}
                      match={m}
                      teamId={selectedTeamId!}
                      teamsById={teamsById}
                    />
                  ))}
                </div>
              </div>
            )}

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
