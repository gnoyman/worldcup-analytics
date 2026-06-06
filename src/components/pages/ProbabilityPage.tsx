"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/components/AppContext";
import {
  calculateTeamProbabilities,
  calculateAllTeamProbabilities,
} from "@/engine/probabilities/probabilities";
import {
  analyzeMatchup,
  computeMatchupMatrix,
  getMatrixEntry,
} from "@/engine/matchup/matchup";
import type { KnockoutStage, Team, TeamProbabilities, MonteCarloResult } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<KnockoutStage, string> = {
  "Round of 32":  "שלב 32",
  "Round of 16":  "שמינית גמר",
  "Quarterfinal": "רביע גמר",
  "Semifinal":    "חצי גמר",
  "Final":        "גמר",
};

function pct(p: number) {
  return `${(p * 100).toFixed(1)}%`;
}

function probCellStyle(p: number): React.CSSProperties {
  if (p >= 0.5)  return { background: "#bbf7d0", color: "#15803d" };
  if (p >= 0.25) return { background: "#fde68a", color: "#92400e" };
  if (p >= 0.08) return { background: "#fed7aa", color: "#c2410c" };
  return { background: "#f1f5f9", color: "#94a3b8" };
}

// ── Probability bar row ───────────────────────────────────────────────────────

function ProbRow({
  label,
  value,
  gradient,
}: {
  label: string;
  value: number;
  gradient: string;
}) {
  const numColor = value >= 0.4 ? "#16a34a" : value >= 0.15 ? "#d97706" : "#64748b";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm flex-1 truncate text-[#475569]">{label}</span>
      <div className="flex items-center gap-2 shrink-0 w-36">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: "8px", background: "#e8eef8" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, value * 100)}%`, background: gradient }}
          />
        </div>
        <span className="text-xs font-black tabular-nums w-10 text-right" style={{ color: numColor }}>
          {pct(value)}
        </span>
      </div>
    </div>
  );
}

// ── Ranked team entry type ────────────────────────────────────────────────────

type RankedEntry = {
  rank: number;
  teamId: string;
  team: Team;
  winTournament: number;
  reachFinal: number;
  qualifyFromGroup: number;
};

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankCircle({ rank }: { rank: number }) {
  const style =
    rank === 1 ? { bg: "linear-gradient(135deg,#d97706,#fbbf24)", text: "#fff" } :
    rank === 2 ? { bg: "linear-gradient(135deg,#64748b,#94a3b8)", text: "#fff" } :
    rank === 3 ? { bg: "linear-gradient(135deg,#92400e,#d97706)",  text: "#fff" } :
                 { bg: "#f1f5f9",                                   text: "#94a3b8" };
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 leading-none"
      style={{ background: style.bg, color: style.text }}
    >
      {rank}
    </div>
  );
}

// ── Power rankings default view ───────────────────────────────────────────────

function PowerRankingsView({
  rankedTeams,
  mcResult,
  mcLoading,
}: {
  rankedTeams: RankedEntry[];
  mcResult: MonteCarloResult | null;
  mcLoading: boolean;
}) {
  const maxProb = Math.max(rankedTeams[0]?.winTournament ?? 0.01, 0.01);
  const top3    = rankedTeams.slice(0, 3);
  const rest    = rankedTeams.slice(3, 16);

  const podiumStyles = [
    { border: "#f59e0b", bg: "#fffbeb", textColor: "#b45309" },
    { border: "#94a3b8", bg: "#f8fafc", textColor: "#475569" },
    { border: "#d97706", bg: "#fff7ed", textColor: "#92400e" },
  ];

  return (
    <div className="space-y-4">
      {/* MC status */}
      {mcLoading && (
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.3)" }}
        >
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0" />
          <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>מחשב Monte Carlo — ממתין לתוצאות…</span>
        </div>
      )}
      {mcResult && !mcLoading && (
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.25)" }}
        >
          <span className="text-[#4ade80] text-sm font-black shrink-0">✓</span>
          <span className="text-xs font-bold" style={{ color: "#4ade80" }}>
            Monte Carlo · {mcResult.iterations.toLocaleString()} ריצות ·{" "}
            {mcResult.durationMs}ms
          </span>
        </div>
      )}

      {/* Top 3 contender cards */}
      <div>
        <p className="sec-label mb-2.5">מועמדות לגביע</p>
        <div className="grid grid-cols-3 gap-2">
          {top3.map((entry, i) => {
            const s = podiumStyles[i];
            return (
              <div
                key={entry.teamId}
                className="rounded-2xl p-3 text-center"
                style={{
                  background: s.bg,
                  border: `2px solid ${s.border}`,
                  boxShadow: "0 3px 16px rgba(0,0,0,.25)",
                }}
              >
                <div className="text-[24px] leading-none mb-1.5">{entry.team.flag}</div>
                <div className="text-[9px] font-bold text-[#0f172a] truncate leading-tight">{entry.team.name}</div>
                <div
                  className="text-base font-black mt-1.5 leading-none"
                  style={{ color: s.textColor }}
                >
                  {(entry.winTournament * 100).toFixed(1)}%
                </div>
                <div className="text-[8px] text-[#94a3b8] font-bold mt-1 uppercase tracking-wide">זכייה</div>
                <div
                  className="text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-full inline-block"
                  style={{ background: `${s.border}18`, color: s.border }}
                >
                  #{entry.rank}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full power rankings */}
      <div>
        <p className="sec-label mb-2.5">דירוג עוצמה</p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}
        >
          {rankedTeams.slice(0, 16).map((entry, i) => {
            const isTop = i < 3;
            const rowStyle =
              i === 0 ? { background: "#fffbeb", borderLeft: "3px solid #f59e0b" } :
              i === 1 ? { background: "#f8fafc", borderLeft: "3px solid #94a3b8" } :
              i === 2 ? { background: "#fff7ed", borderLeft: "3px solid #d97706" } :
                        { background: "#fff",    borderLeft: "3px solid transparent" };

            return (
              <div
                key={entry.teamId}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{
                  ...rowStyle,
                  borderBottom: i < 15 ? "1px solid #f0f5ff" : "none",
                }}
              >
                <RankCircle rank={entry.rank} />
                <span className="text-lg leading-none shrink-0">{entry.team.flag}</span>
                <span
                  className="flex-1 truncate"
                  style={{ fontSize: "13px", fontWeight: isTop ? 700 : 500, color: "#0f172a" }}
                >
                  {entry.team.name}
                </span>
                <div className="w-20 h-1.5 rounded-full bg-[#e8eef8] overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(entry.winTournament / maxProb) * 100}%`,
                      background: "linear-gradient(to right,#7c3aed,#f59e0b)",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-black w-10 text-left shrink-0"
                  style={{ color: "#7c3aed" }}
                >
                  {(entry.winTournament * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* silence unused-var warning for rest */}
      {rest.length === 0 && null}
    </div>
  );
}

// ── Team detail view ──────────────────────────────────────────────────────────

function TeamDetailView({
  team,
  detProbs,
  mcTeam,
  isMC,
  mcLoading,
}: {
  team: Team;
  detProbs: TeamProbabilities | null;
  mcTeam: ReturnType<typeof useMemo> | null;
  isMC: boolean;
  mcLoading: boolean;
}) {
  if (!detProbs) return null;
  const mc = mcTeam as { winTournament: number; reachFinal: number; reachSemifinal: number; reachQuarterfinal: number; reachRound16: number; reachRound32: number; qualifyFromGroup: number; finishFirst: number; finishSecond: number; finishThirdQualify: number } | null;

  return (
    <div className="space-y-3">
      {/* Team header */}
      <div
        className="rounded-2xl relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 6px 24px rgba(124,58,237,.4)" }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden
        >
          <span className="leading-none" style={{ fontSize: "140px", opacity: 0.25, transform: "rotate(-6deg)" }}>
            {team.flag}
          </span>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.18) 50%, rgba(0,0,0,.5) 100%)" }}
          aria-hidden
        />
        <div className="relative p-4 flex items-center gap-3">
          <span className="text-4xl leading-none">{team.flag}</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-lg truncate leading-tight">{team.name}</p>
            <p className="text-purple-200 text-xs mt-0.5">דירוג כוח: {team.strengthRating}</p>
          </div>
          {mcLoading ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/20 text-white animate-pulse">מחשב…</span>
          ) : isMC ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-400/20 text-green-200">MC ✓</span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/10 text-purple-200">קירוב</span>
          )}
        </div>
      </div>

      {/* Knockout probs */}
      <div className="wc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom,#f59e0b,#7c3aed)" }} />
          <p className="font-bold text-sm text-[#0f172a]">שלבי נוקאאוט</p>
        </div>
        <div className="space-y-3">
          <ProbRow label="זכייה בטורניר"  value={mc?.winTournament      ?? detProbs.winTournament}      gradient="linear-gradient(to right,#d97706,#fbbf24)" />
          <ProbRow label="גמר"            value={mc?.reachFinal         ?? detProbs.reachFinal}          gradient="linear-gradient(to right,#b45309,#f59e0b)" />
          <ProbRow label="חצי גמר"        value={mc?.reachSemifinal     ?? detProbs.reachSemifinal}      gradient="linear-gradient(to right,#7c3aed,#a78bfa)" />
          <ProbRow label="רביע גמר"       value={mc?.reachQuarterfinal  ?? detProbs.reachQuarterfinal}   gradient="linear-gradient(to right,#0284c7,#38bdf8)" />
          <ProbRow label="שמינית גמר"     value={mc?.reachRound16       ?? detProbs.reachRound16}        gradient="linear-gradient(to right,#0284c7,#7dd3fc)" />
          {mc && <ProbRow label="שלב 32"  value={mc.reachRound32}                                       gradient="linear-gradient(to right,#16a34a,#4ade80)" />}
        </div>
      </div>

      {/* Group stage probs */}
      <div className="wc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom,#16a34a,#0284c7)" }} />
          <p className="font-bold text-sm text-[#0f172a]">שלב הבתים</p>
        </div>
        <div className="space-y-3">
          <ProbRow label="יציאה מהבית"     value={mc?.qualifyFromGroup    ?? detProbs.qualifyFromGroup}    gradient="linear-gradient(to right,#15803d,#4ade80)" />
          <ProbRow label="ראשון בבית"       value={mc?.finishFirst         ?? detProbs.finishFirst}         gradient="linear-gradient(to right,#d97706,#fcd34d)" />
          <ProbRow label="שני בבית"         value={mc?.finishSecond        ?? detProbs.finishSecond}        gradient="linear-gradient(to right,#0284c7,#7dd3fc)" />
          <ProbRow label="שלישי (מעפיל)"   value={mc?.finishThirdQualify  ?? detProbs.finishThird}         gradient="linear-gradient(to right,#c2410c,#fb923c)" />
        </div>
      </div>
    </div>
  );
}

// ── Team probability tab ──────────────────────────────────────────────────────

function TeamProbTab() {
  const { tournament, mcResult, mcLoading } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const allTeams = tournament.groups.flatMap((g) => g.teams);
  const team = selectedId ? allTeams.find((t) => t.id === selectedId) : null;

  const allTeamProbs = useMemo(
    () => calculateAllTeamProbabilities(tournament.standings, tournament.groups),
    [tournament.standings, tournament.groups]
  );

  const rankedTeams = useMemo((): RankedEntry[] => {
    if (mcResult) {
      return [...mcResult.teams]
        .sort((a, b) => b.winTournament - a.winTournament)
        .map((mc, i) => {
          const t = allTeams.find((x) => x.id === mc.teamId);
          if (!t) return null;
          return {
            rank: i + 1,
            teamId: mc.teamId,
            team: t,
            winTournament: mc.winTournament,
            reachFinal: mc.reachFinal,
            qualifyFromGroup: mc.qualifyFromGroup,
          };
        })
        .filter((x): x is RankedEntry => x !== null);
    }
    return [...allTeamProbs]
      .sort((a, b) => b.winTournament - a.winTournament)
      .map((p, i) => ({
        rank: i + 1,
        teamId: p.teamId,
        team: p.team,
        winTournament: p.winTournament,
        reachFinal: p.reachFinal,
        qualifyFromGroup: p.qualifyFromGroup,
      }));
  }, [mcResult, allTeamProbs, allTeams]);

  const detProbs = useMemo(
    () => team ? calculateTeamProbabilities(team, tournament.standings, tournament.groups) : null,
    [team, tournament.standings, tournament.groups]
  );

  const mcTeam = useMemo(
    () => (mcResult && selectedId ? mcResult.teams.find((t) => t.teamId === selectedId) ?? null : null),
    [mcResult, selectedId]
  );

  return (
    <div>
      {/* Team picker */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {allTeams.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={
              selectedId === t.id
                ? { background: "#7c3aed", color: "#fff", boxShadow: "0 2px 10px rgba(124,58,237,.5)" }
                : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)" }
            }
          >
            <span className="text-sm leading-none">{t.flag}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {team ? (
        <TeamDetailView
          team={team}
          detProbs={detProbs}
          mcTeam={mcTeam}
          isMC={!!mcTeam}
          mcLoading={mcLoading}
        />
      ) : (
        <PowerRankingsView
          rankedTeams={rankedTeams}
          mcResult={mcResult}
          mcLoading={mcLoading}
        />
      )}
    </div>
  );
}

// ── Matchup tab ───────────────────────────────────────────────────────────────

function MatchupTab() {
  const { tournament } = useApp();
  const allTeams = tournament.groups.flatMap((g) => g.teams);
  const [teamAId, setTeamAId] = useState<string>(allTeams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState<string>(allTeams[1]?.id ?? "");

  const analysis = useMemo(
    () =>
      teamAId && teamBId && teamAId !== teamBId
        ? analyzeMatchup(teamAId, teamBId, tournament.groups, tournament.standings, tournament.matches, tournament.knockoutBracket.matches)
        : null,
    [teamAId, teamBId, tournament]
  );

  const teamA = allTeams.find((t) => t.id === teamAId);
  const teamB = allTeams.find((t) => t.id === teamBId);

  const Picker = ({
    label, value, onChange, accentColor,
  }: { label: string; value: string; onChange: (id: string) => void; accentColor: string }) => (
    <div className="flex-1 min-w-0">
      <p className="sec-label mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
        {allTeams.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0"
            style={
              value === t.id
                ? { background: accentColor, color: "#fff" }
                : { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)" }
            }
          >
            <span className="text-sm leading-none">{t.flag}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Picker label="נבחרת א׳" value={teamAId} onChange={setTeamAId} accentColor="#0284c7" />
        <Picker label="נבחרת ב׳" value={teamBId} onChange={setTeamBId} accentColor="#f59e0b" />
      </div>

      {analysis && teamA && teamB && (
        <div className="space-y-3">
          {/* VS header */}
          <div
            className="rounded-2xl p-4 flex items-center justify-center gap-5"
            style={{ background: "#fff", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 4px 20px rgba(0,0,0,.35)" }}
          >
            <div className="text-center">
              <div className="text-3xl mb-1">{teamA.flag}</div>
              <div className="text-xs font-bold text-[#0284c7]">{teamA.name}</div>
            </div>
            <div
              className="text-base font-black px-3 py-1.5 rounded-full"
              style={{ background: "#f1f5f9", color: "#94a3b8" }}
            >
              vs
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">{teamB.flag}</div>
              <div className="text-xs font-bold text-[#f59e0b]">{teamB.name}</div>
            </div>
          </div>

          {analysis.sameGroup && (
            <div
              className="rounded-xl p-3 text-xs font-semibold"
              style={{ background: "rgba(167,139,250,.15)", border: "1px solid rgba(167,139,250,.3)", color: "#a78bfa" }}
            >
              שתי הנבחרות באותו בית — נפגשו כבר בשלב הבתים
            </div>
          )}

          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 4px 20px rgba(0,0,0,.35)" }}
          >
            <div className="p-4">
              <div className="text-center mb-4">
                <div className="text-4xl font-black mb-1" style={{ color: "#16a34a" }}>
                  {pct(analysis.meetingProbability)}
                </div>
                <p className="sec-label" style={{ color: "rgba(255,255,255,.4)" }}>הסתברות למפגש בנוקאאוט</p>
                <div className="mt-3 h-2.5 rounded-full overflow-hidden mx-6" style={{ background: "rgba(255,255,255,.1)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, analysis.meetingProbability * 100)}%`,
                      background: "linear-gradient(to right,#15803d,#4ade80)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "מוקדם", value: analysis.earliestKnockoutStage, bg: "rgba(56,189,248,.15)", color: "#38bdf8" },
                  { label: "צפוי",  value: analysis.projectedMeetingStage, bg: "rgba(251,191,36,.15)", color: "#fbbf24" },
                  { label: "מאוחר", value: analysis.latestKnockoutStage,   bg: "rgba(74,222,128,.15)", color: "#4ade80" },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} className="rounded-xl p-2.5" style={{ background: bg, border: `1px solid ${color}30` }}>
                    <p className="sec-label mb-1" style={{ color: `${color}99` }}>{label}</p>
                    <p className="text-xs font-bold" style={{ color }}>
                      {value ? STAGE_LABEL[value] : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(analysis.pathConditions.forTeamA.length > 0 || analysis.pathConditions.forTeamB.length > 0) && (
            <div className="wc-card p-4">
              <p className="sec-label mb-3">תנאים נדרשים למפגש</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { team: teamA, conditions: analysis.pathConditions.forTeamA, color: "#0284c7", bg: "#eff9ff" },
                  { team: teamB, conditions: analysis.pathConditions.forTeamB, color: "#f59e0b", bg: "#fffbeb" },
                ].map(({ team: t, conditions, color, bg }) => (
                  <div key={t.id} className="rounded-xl p-2.5" style={{ background: bg }}>
                    <p className="text-xs font-bold mb-1.5" style={{ color }}>
                      {t.flag} {t.name}
                    </p>
                    {conditions.length === 0 ? (
                      <p className="text-xs text-[#94a3b8]">אין תנאים</p>
                    ) : (
                      <ul className="space-y-1">
                        {conditions.map((c, i) => (
                          <li key={i} className="text-xs flex gap-1 text-[#475569]">
                            <span style={{ color }}>•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Matrix tab ────────────────────────────────────────────────────────────────

const ALL_GROUP_IDS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function MatrixTab() {
  const { tournament } = useApp();
  const allTeams = tournament.groups.flatMap((g) => g.teams);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["A","B"]);
  const [detailPair, setDetailPair] = useState<[string,string] | null>(null);

  const toggleGroup = (g: string) => {
    setSelectedGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(-4)
    );
    setDetailPair(null);
  };

  const matrixTeams: Team[] = useMemo(
    () => tournament.groups.filter((g) => selectedGroups.includes(g.id)).flatMap((g) => g.teams),
    [tournament.groups, selectedGroups]
  );

  const matrix = useMemo(
    () => computeMatchupMatrix(matrixTeams.map((t) => t.id), tournament.groups, tournament.standings, tournament.matches, tournament.knockoutBracket.matches),
    [matrixTeams, tournament]
  );

  const detail = useMemo(
    () => detailPair ? analyzeMatchup(detailPair[0], detailPair[1], tournament.groups, tournament.standings, tournament.matches, tournament.knockoutBracket.matches) : null,
    [detailPair, tournament]
  );

  const CELL = 36;

  return (
    <div>
      <p className="sec-label mb-2">בחר עד 4 בתים:</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_GROUP_IDS.map((g) => (
          <button
            key={g}
            onClick={() => toggleGroup(g)}
            className={`chip ${selectedGroups.includes(g) ? "chip-active" : ""}`}
          >
            {g}
          </button>
        ))}
      </div>

      {matrixTeams.length < 2 ? (
        <div className="wc-card p-8 text-center sec-label">בחר לפחות שני בתים</div>
      ) : (
        <>
          {/* Matrix grid */}
          <div
            className="overflow-x-auto no-scrollbar rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}
          >
            <div style={{ display: "inline-block", minWidth: "max-content" }}>
              {/* Header row */}
              <div className="flex items-center gap-0.5 mb-0.5">
                <div style={{ width: 32, height: 32 }} />
                {matrixTeams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-center text-base"
                    style={{ width: CELL, height: 28 }}
                    title={t.name}
                  >
                    {t.flag}
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {matrixTeams.map((rowTeam, ri) => (
                <div key={rowTeam.id} className="flex items-center gap-0.5 mb-0.5">
                  <div
                    className="flex items-center justify-center text-base"
                    style={{ width: 32, height: CELL }}
                    title={rowTeam.name}
                  >
                    {rowTeam.flag}
                  </div>
                  {matrixTeams.map((colTeam, ci) => {
                    if (ri === ci) return (
                      <div
                        key={colTeam.id}
                        className="rounded-xl"
                        style={{ width: CELL, height: CELL, background: "rgba(255,255,255,.08)" }}
                      />
                    );
                    const entry = getMatrixEntry(rowTeam.id, colTeam.id, matrix);
                    const p = entry?.probability ?? 0;
                    const isSelected = detailPair &&
                      ((detailPair[0] === rowTeam.id && detailPair[1] === colTeam.id) ||
                        (detailPair[0] === colTeam.id && detailPair[1] === rowTeam.id));
                    return (
                      <button
                        key={colTeam.id}
                        onClick={() => setDetailPair(isSelected ? null : [rowTeam.id, colTeam.id])}
                        className="rounded-xl text-[10px] font-bold transition-all"
                        style={{
                          width: CELL, height: CELL,
                          ...probCellStyle(p),
                          outline: isSelected ? "2.5px solid #0284c7" : "none",
                          outlineOffset: "1px",
                        }}
                        title={`${rowTeam.name} vs ${colTeam.name}: ${pct(p)}`}
                      >
                        {p > 0 ? `${Math.round(p * 100)}` : "—"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              { bg: "#bbf7d0", color: "#15803d", label: "≥50%" },
              { bg: "#fde68a", color: "#92400e", label: "≥25%" },
              { bg: "#fed7aa", color: "#c2410c", label: "≥8%" },
              { bg: "#f1f5f9", color: "#94a3b8", label: "<8%" },
            ].map(({ bg, color, label }) => (
              <span key={label} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
                {label}
              </span>
            ))}
          </div>

          {/* Detail panel */}
          {detail && (
            <div className="mt-3 wc-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{detail.teamA.flag}</span>
                  <span className="font-bold text-xs text-[#0284c7]">{detail.teamA.name}</span>
                  <span className="text-xs text-[#94a3b8]">vs</span>
                  <span className="font-bold text-xs text-[#f59e0b]">{detail.teamB.name}</span>
                  <span className="text-xl">{detail.teamB.flag}</span>
                </div>
                <button onClick={() => setDetailPair(null)} className="text-lg leading-none text-[#94a3b8]">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { label: "הסתברות", value: pct(detail.meetingProbability), bg: "#f0fdf4", color: "#16a34a" },
                  { label: "מוקדם",   value: detail.earliestKnockoutStage ? STAGE_LABEL[detail.earliestKnockoutStage] : "—", bg: "#eff9ff", color: "#0284c7" },
                  { label: "מאוחר",   value: detail.latestKnockoutStage   ? STAGE_LABEL[detail.latestKnockoutStage]   : "—", bg: "#fffbeb", color: "#f59e0b" },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} className="rounded-xl p-2" style={{ background: bg }}>
                    <p className="sec-label mb-0.5" style={{ color: "#64748b" }}>{label}</p>
                    <p className="font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type ActiveTab = "team" | "matchup" | "matrix";

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: "team",    label: "נבחרת"  },
  { id: "matchup", label: "מפגש"   },
  { id: "matrix",  label: "מטריצה" },
];

export function ProbabilityPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("team");

  return (
    <div className="pb-[80px]">
      {/* Hero */}
      <div className="page-section-header px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-2xl">📈</span>
          <h1 className="text-2xl font-black text-white tracking-tight">הסתברויות</h1>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(147,197,253,.5)" }}>
          FIFA World Cup 2026 · ניתוח סטטיסטי מתקדם
        </p>
        <div className="title-bar mt-2" />
      </div>

      <div className="px-4 pt-4">
        {/* Tab navigation */}
        <div className="tab-switcher mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tab-btn ${activeTab === t.id ? "tab-btn-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "team"    && <TeamProbTab />}
        {activeTab === "matchup" && <MatchupTab />}
        {activeTab === "matrix"  && <MatrixTab />}
      </div>
    </div>
  );
}
