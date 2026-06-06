"use client";

import type { GroupStanding } from "@/types";

interface FeaturedGroupCardProps {
  groupId: string;
  standings: GroupStanding[];
  accentGrad: string;
  accent: string;
  fromApi?: boolean;
}

const RANK_STYLE = [
  { bg: "linear-gradient(135deg,#f59e0b,#b45309)", glow: "rgba(245,158,11,.45)", text: "#fff" },
  { bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", glow: "rgba(59,130,246,.45)",  text: "#fff" },
  { bg: "linear-gradient(135deg,#f97316,#c2410c)", glow: "rgba(249,115,22,.45)",  text: "#fff" },
  { bg: "#e2e8f0",                                  glow: "transparent",            text: "#94a3b8" },
] as const;

const QUAL_INFO = [
  { borderColor: "#f59e0b", label: "עולה ישיר",  labelColor: "#b45309" },
  { borderColor: "#3b82f6", label: "עולה ישיר",  labelColor: "#1d4ed8" },
  { borderColor: "#f97316", label: "מועמד",       labelColor: "#c2410c" },
  { borderColor: "rgba(226,232,240,.4)", label: "", labelColor: "#94a3b8" },
] as const;

export function FeaturedGroupCard({
  groupId,
  standings,
  accentGrad,
  accent,
  fromApi = false,
}: FeaturedGroupCardProps) {
  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        boxShadow:
          "0 12px 48px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.07)",
      }}
    >
      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      <div
        className="relative px-5 pt-5 pb-5 overflow-hidden"
        style={{ background: accentGrad }}
      >
        {/* Radial highlight top-end */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 80% -10%, rgba(255,255,255,.22) 0%, transparent 65%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-8 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(0,0,0,.12))",
          }}
        />

        <div className="relative">
          {/* Eyebrow */}
          <p
            className="text-[9px] font-black uppercase mb-2"
            style={{ color: "rgba(255,255,255,.5)", letterSpacing: ".22em" }}
          >
            FIFA WORLD CUP 2026
          </p>

          {/* Title + flags row */}
          <div className="flex items-center justify-between gap-3">
            <h2
              className="text-white font-black leading-none tracking-tighter"
              style={{ fontSize: "clamp(2rem, 9vw, 2.8rem)" }}
            >
              GROUP {groupId}
            </h2>

            {/* Overlapping flags */}
            <div
              className="flex items-center shrink-0"
              style={{ direction: "ltr" }}
            >
              {standings.map((s, i) => (
                <span
                  key={s.teamId}
                  className="text-[28px] leading-none"
                  style={{
                    display: "block",
                    marginLeft: i > 0 ? "-5px" : 0,
                    filter: "drop-shadow(0 2px 5px rgba(0,0,0,.45))",
                    position: "relative",
                    zIndex: standings.length - i,
                  }}
                >
                  {s.team.flag}
                </span>
              ))}
            </div>
          </div>

          {/* Status pills */}
          <div
            className="flex items-center gap-2 mt-3"
            style={{ direction: "ltr" }}
          >
            <span
              className="inline-flex items-center text-[10px] font-bold text-white/80 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(0,0,0,.22)" }}
            >
              {standings[0]?.played ?? 0}/3 matchdays
            </span>
            {fromApi && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/85 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,.22)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#4ade80" }}
                />
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── COLUMN HEADERS ───────────────────────────────────────── */}
      <div
        className="flex items-center px-4 py-2"
        style={{
          background: "#f8faff",
          borderBottom: "1px solid #eef2ff",
        }}
      >
        {/* Team column — no label, takes remaining space */}
        <div className="flex-1 min-w-0" />

        {/* Stat labels — direction ltr so columns read left→right */}
        <div
          className="flex items-center shrink-0"
          style={{ direction: "ltr" }}
        >
          {(
            [
              { key: "p",   label: "P",   w: 28 },
              { key: "gd",  label: "GD",  w: 32 },
              { key: "pts", label: "PTS", w: 44 },
            ] as const
          ).map((col) => (
            <span
              key={col.key}
              className="text-center text-[9px] font-black uppercase tracking-widest"
              style={{
                width: col.w,
                color: col.key === "pts" ? "#94a3b8" : "#b8c9e8",
              }}
            >
              {col.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── TEAM ROWS ────────────────────────────────────────────── */}
      <div className="bg-white">
        {standings.map((s, i) => {
          const ri = Math.min(s.position - 1, 3);
          const rStyle = RANK_STYLE[ri];
          const qInfo = QUAL_INFO[ri];
          const eliminated = s.position > 3;
          const gdColor =
            s.goalDifference > 0
              ? "#16a34a"
              : s.goalDifference < 0
              ? "#dc2626"
              : "#94a3b8";
          const isLast = i === standings.length - 1;

          return (
            <div
              key={s.teamId}
              className="flex items-center gap-3 px-4 transition-colors active:bg-slate-50"
              style={{
                paddingTop: 14,
                paddingBottom: 14,
                borderBottom: isLast ? "none" : "1px solid #f1f5fb",
                borderLeft: `4px solid ${qInfo.borderColor}`,
                background: eliminated ? "#fafcff" : "#fff",
              }}
            >
              {/* ── Rank badge ── */}
              <div
                className="shrink-0 flex items-center justify-center font-black text-[15px]"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: rStyle.bg,
                  color: rStyle.text,
                  boxShadow:
                    rStyle.glow !== "transparent"
                      ? `0 4px 14px ${rStyle.glow}, 0 1px 4px rgba(0,0,0,.15)`
                      : "0 1px 4px rgba(0,0,0,.07)",
                }}
              >
                {s.position}
              </div>

              {/* ── Flag ── */}
              <span
                className="shrink-0 leading-none"
                style={{
                  fontSize: "2rem",
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,.2))",
                }}
              >
                {s.team.flag}
              </span>

              {/* ── Team name + qual label ── */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold leading-tight truncate"
                  style={{
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    color: eliminated ? "#94a3b8" : "#0f172a",
                  }}
                >
                  {s.team.name}
                </p>
                {qInfo.label ? (
                  <p
                    className="mt-0.5 font-bold uppercase"
                    style={{
                      fontSize: 9,
                      letterSpacing: ".12em",
                      color: qInfo.labelColor,
                    }}
                  >
                    {qInfo.label}
                  </p>
                ) : (
                  <p
                    className="mt-0.5 font-medium"
                    style={{ fontSize: 9, color: "#cbd5e1" }}
                  >
                    —
                  </p>
                )}
              </div>

              {/* ── Stats (always LTR) ── */}
              <div
                className="flex items-center shrink-0"
                style={{ direction: "ltr" }}
              >
                {/* Played */}
                <span
                  className="text-center text-xs"
                  style={{ width: 28, color: "#94a3b8" }}
                >
                  {s.played}
                </span>

                {/* Goal diff */}
                <span
                  className="text-center text-xs font-bold"
                  style={{ width: 32, color: gdColor }}
                >
                  {s.goalDifference > 0
                    ? `+${s.goalDifference}`
                    : s.goalDifference}
                </span>

                {/* Points — hero number */}
                <div
                  className="flex items-center justify-center font-black text-xl rounded-xl shrink-0"
                  style={{
                    width: 44,
                    height: 42,
                    background: eliminated ? "#f1f5f9" : `${accent}1c`,
                    color: eliminated ? "#94a3b8" : accent,
                  }}
                >
                  {s.points}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── LEGEND ───────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1.5"
        style={{ background: "#fafcff", borderTop: "1px solid #eef3ff" }}
      >
        {(
          [
            { color: "#f59e0b", label: "מקום 1 — עולה ישיר" },
            { color: "#3b82f6", label: "מקום 2 — עולה ישיר" },
            { color: "#f97316", label: "מקום 3 — מועמד ל-8 הטובים" },
          ] as const
        ).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="shrink-0"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                display: "block",
              }}
            />
            <span
              className="font-medium"
              style={{ fontSize: 9, color: "#94a3b8" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
