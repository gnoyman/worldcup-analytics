"use client";

import { useState } from "react";
import { useApp } from "@/components/AppContext";

const GROUP_COLOR: Record<string, string> = {
  A: "#0ea5e9", B: "#10b981", C: "#8b5cf6", D: "#f97316",
  E: "#f43f5e", F: "#06b6d4", G: "#f59e0b", H: "#6366f1",
  I: "#14b8a6", J: "#65a30d", K: "#ec4899", L: "#3b82f6",
};

export function ScenariosPage() {
  const { tournament, getCurrentMatches, updateMatchScore, resetToMockData } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const matches  = getCurrentMatches();
  const groupIds = Array.from(new Set(tournament.groups.map((g) => g.id))).sort();
  const allTeams = tournament.groups.flatMap((g) => g.teams);

  const unplayed = selectedGroup
    ? matches.filter((m) => m.groupId === selectedGroup && m.status === "unplayed")
    : [];

  const groupColor = selectedGroup ? GROUP_COLOR[selectedGroup] ?? "#0284c7" : "#0284c7";

  return (
    <div className="pb-[80px]">
      {/* Hero */}
      <div
        className="px-4 pt-6 pb-4"
        style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl">✏️</span>
              <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">תרחישים</h1>
            </div>
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
              FIFA World Cup 2026 · ערוך תוצאות עתידיות
            </p>
          </div>
          <button
            onClick={resetToMockData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 mt-1"
            style={{
              background: "#f8faff",
              border: "1px solid var(--border)",
              color: "#64748b",
            }}
          >
            ↺ איפוס
          </button>
        </div>
        <div className="title-bar mt-2" />
      </div>

      <div className="px-4 pt-4">
        {/* Group selector */}
        <p className="sec-label mb-2">בחר בית לעריכה</p>
        <div className="flex gap-2 no-scrollbar overflow-x-auto pb-2 mb-5">
          {groupIds.map((gid) => {
            const col = GROUP_COLOR[gid] ?? "#0284c7";
            const isActive = selectedGroup === gid;
            return (
              <button
                key={gid}
                onClick={() => setSelectedGroup(selectedGroup === gid ? null : gid)}
                className="chip shrink-0"
                style={
                  isActive
                    ? {
                        background: col,
                        borderColor: col,
                        color: "#fff",
                        boxShadow: `0 2px 10px ${col}55`,
                      }
                    : {}
                }
              >
                {gid}
              </button>
            );
          })}
        </div>

        {selectedGroup ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1 h-5 rounded-full"
                style={{ background: groupColor }}
              />
              <p className="sec-label">
                משחקים שלא התחילו — בית {selectedGroup}
              </p>
            </div>

            {unplayed.length === 0 ? (
              <div className="wc-card p-6 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm font-semibold text-[#475569]">
                  כל המשחקים בבית זה הוגדרו
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unplayed.map((m) => {
                  const h = allTeams.find((t) => t.id === m.homeTeamId);
                  const a = allTeams.find((t) => t.id === m.awayTeamId);
                  if (!h || !a) return null;
                  const isEditing = editingMatchId === m.id;

                  return (
                    <div
                      key={m.id}
                      className="wc-card p-4"
                      style={
                        isEditing
                          ? {
                              borderColor: groupColor,
                              boxShadow: `0 0 0 2px ${groupColor}30`,
                            }
                          : {}
                      }
                    >
                      {/* Match day badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${groupColor}15`,
                            color: groupColor,
                          }}
                        >
                          מחזור {m.matchDay}
                        </span>
                        {!isEditing && (
                          <span className="text-[10px] text-[#94a3b8] font-medium">
                            טרם התחיל
                          </span>
                        )}
                      </div>

                      {/* Teams row */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-sm flex-1 text-[#0f172a] truncate">
                          {h.name}
                        </span>

                        {isEditing ? (
                          <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{
                              background: "#f8faff",
                              border: `2px solid ${groupColor}`,
                            }}
                          >
                            <input
                              type="number" min="0" max="9"
                              value={homeScore}
                              onChange={(e) => setHomeScore(Number(e.target.value))}
                              className="w-8 text-center font-black text-base text-[#0f172a] bg-transparent outline-none"
                            />
                            <span className="text-[#94a3b8] font-bold">–</span>
                            <input
                              type="number" min="0" max="9"
                              value={awayScore}
                              onChange={(e) => setAwayScore(Number(e.target.value))}
                              className="w-8 text-center font-black text-base text-[#0f172a] bg-transparent outline-none"
                            />
                          </div>
                        ) : (
                          <div
                            className="score-pill shrink-0 opacity-40 text-[#0f172a]"
                            style={{ background: "#f1f5f9", color: "#0f172a" }}
                          >
                            ? – ?
                          </div>
                        )}

                        <span className="font-bold text-sm flex-1 text-left text-[#0f172a] truncate">
                          {a.name}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              updateMatchScore(m.id, homeScore, awayScore);
                              setEditingMatchId(null);
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition"
                            style={{ background: groupColor }}
                          >
                            ✓ שמור תוצאה
                          </button>
                          <button
                            onClick={() => setEditingMatchId(null)}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition"
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMatchId(m.id);
                            setHomeScore(0);
                            setAwayScore(0);
                          }}
                          className="w-full py-2 rounded-xl text-sm font-bold transition"
                          style={{
                            background: `${groupColor}10`,
                            border: `1px solid ${groupColor}40`,
                            color: groupColor,
                          }}
                        >
                          ✎ ערוך תוצאה
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="wc-card p-10 text-center">
            <div className="text-4xl mb-3">✏️</div>
            <p className="text-sm font-semibold text-[#475569]">
              בחר בית כדי לערוך תוצאות
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
