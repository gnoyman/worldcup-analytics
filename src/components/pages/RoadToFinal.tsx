"use client";

import { useApp } from "@/components/AppContext";
import type { KnockoutMatch, KnockoutTeam } from "@/types";
import { SlotLabel } from "@/components/SlotLabel";

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W = 148;
const CONN_W = 22;
const UNIT   = 62;

// ── Derive bracket columns from the routing graph ─────────────────────────────

// Builds the ordered column arrays for one bracket half by walking the
// nextMatchId/nextSlot links backward from the semi-final to R32.
// home-slot children always come before away-slot children so that consecutive
// pairs in each column correctly connect to the same parent in the next column.
function deriveHalfColumns(all: KnockoutMatch[], sfId: string | undefined) {
  type Slot = { home?: string; away?: string };
  const children = new Map<string, Slot>();
  for (const m of all) {
    if (m.nextMatchId) {
      const entry: Slot = children.get(m.nextMatchId) ?? {};
      entry[m.nextSlot!] = m.id;
      children.set(m.nextMatchId, entry);
    }
  }
  const ordered = (id: string | undefined): string[] => {
    const c = children.get(id ?? "") ?? {};
    return [c.home, c.away].filter((x): x is string => !!x);
  };
  const qf  = ordered(sfId);
  const r16 = qf.flatMap(ordered);
  const r32 = r16.flatMap(ordered);
  return { r32, r16, qf, sf: sfId ? [sfId] : [] as string[] };
}

// ── SVG connector ─────────────────────────────────────────────────────────────

function Connector({
  pairCount,
  slotH,
  flip = false,
}: {
  pairCount: number;
  slotH: number;
  flip?: boolean;
}) {
  const totalH = pairCount * 2 * slotH;
  const inner  = CONN_W - 3;

  return (
    <svg
      width={CONN_W}
      height={totalH}
      className="shrink-0"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {Array.from({ length: pairCount }).map((_, i) => {
        const base = i * 2 * slotH;
        const top  = base + slotH * 0.5;
        const bot  = base + slotH * 1.5;
        const mid  = base + slotH;
        return (
          <g key={i} stroke="#93c5fd" strokeWidth={2} strokeLinecap="round" fill="none">
            <line x1={0}     y1={top} x2={inner} y2={top} />
            <line x1={inner} y1={top} x2={inner} y2={bot} />
            <line x1={0}     y1={bot} x2={inner} y2={bot} />
            <line x1={inner} y1={mid} x2={CONN_W} y2={mid} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Team row ──────────────────────────────────────────────────────────────────

function TeamRow({
  team,
  side,
  match,
}: {
  team?: KnockoutTeam;
  side: "home" | "away";
  match: KnockoutMatch;
}) {
  const score = side === "home" ? match.homeScore : match.awayScore;
  const won   = !!match.winner && match.winner === team?.teamId;

  if (team) {
    return (
      <div
        className="flex items-center gap-1 px-2 py-[5px] text-[10px] leading-none"
        style={{
          color: won ? "#0f172a" : "#475569",
          fontWeight: won ? 700 : 500,
        }}
      >
        <span className="flex-1 truncate">{team.team.name}</span>
        {score !== undefined && (
          <span
            className="shrink-0 font-black tabular-nums text-[11px] ml-0.5"
            style={{ color: won ? "#f59e0b" : "#94a3b8" }}
          >
            {score}
          </span>
        )}
      </div>
    );
  }

  // TBD slot
  const rawSlot  = side === "home" ? match.homeSlot : match.awaySlot;
  const hasLabel = match.stage === "Round of 32" && !!rawSlot;

  return (
    <div
      className="flex items-center justify-center px-2 py-[5px] text-[10px] leading-none"
      dir="rtl"
      style={{
        color:     hasLabel ? "#64748b" : "#d1d5db",
        fontStyle: "italic",
      }}
    >
      <span className="text-center w-full truncate">
        {hasLabel ? <SlotLabel slot={rawSlot!} /> : "—"}
      </span>
    </div>
  );
}

// ── Match card (tree view) ────────────────────────────────────────────────────

function MatchCard({ match }: { match: KnockoutMatch }) {
  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #dde8f7",
        boxShadow: "0 1px 6px rgba(14,30,64,.06)",
      }}
    >
      <TeamRow team={match.homeTeam} side="home" match={match} />
      <div style={{ height: "1px", background: "#eef3ff" }} />
      <TeamRow team={match.awayTeam} side="away" match={match} />
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({
  matchIds,
  slotH,
  all,
}: {
  matchIds: string[];
  slotH: number;
  all: KnockoutMatch[];
}) {
  return (
    <div className="flex flex-col shrink-0" style={{ width: CARD_W }}>
      {matchIds.map((id) => {
        const m = all.find((x) => x.id === id);
        return (
          <div key={id} className="flex items-center px-0.5" style={{ height: slotH }}>
            {m ? (
              <MatchCard match={m} />
            ) : (
              <div className="w-full h-6 rounded-lg" style={{ background: "#eef3ff" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Bracket half ──────────────────────────────────────────────────────────────

type ColDef = { ids: string[]; slotH: number };

function Half({
  sfId,
  flip,
  all,
}: {
  sfId: string | undefined;
  flip: boolean;
  all: KnockoutMatch[];
}) {
  const h = deriveHalfColumns(all, sfId);

  const cols: ColDef[] = flip
    ? [
        { ids: h.sf,  slotH: UNIT * 8 },
        { ids: h.qf,  slotH: UNIT * 4 },
        { ids: h.r16, slotH: UNIT * 2 },
        { ids: h.r32, slotH: UNIT     },
      ]
    : [
        { ids: h.r32, slotH: UNIT     },
        { ids: h.r16, slotH: UNIT * 2 },
        { ids: h.qf,  slotH: UNIT * 4 },
        { ids: h.sf,  slotH: UNIT * 8 },
      ];

  const connDefs = cols.slice(0, -1).map((col, i) => {
    const next  = cols[i + 1];
    const small = col.slotH <= next.slotH ? col : next;
    return { pairCount: Math.ceil(small.ids.length / 2), slotH: small.slotH };
  });

  return (
    <div className="flex flex-row items-start shrink-0">
      {cols.flatMap((col, ci) => {
        const items: React.ReactNode[] = [
          <Column
            key={`col-${ci}`}
            matchIds={col.ids}
            slotH={col.slotH}
            all={all}
          />,
        ];
        if (ci < cols.length - 1) {
          const cd = connDefs[ci];
          items.push(
            <Connector
              key={`conn-${ci}`}
              pairCount={cd.pairCount}
              slotH={cd.slotH}
              flip={flip}
            />
          );
        }
        return items;
      })}
    </div>
  );
}

// ── Column header strip ───────────────────────────────────────────────────────

const STAGE_LABEL_COLORS: Record<string, string> = {
  "שלב 32":      "#0ea5e9",
  "שמינית גמר":  "#8b5cf6",
  "רביע גמר":    "#f97316",
  "חצי גמר":     "#10b981",
};

function HeaderRow({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-row mb-2">
      {labels.flatMap((label, i) => {
        const color = STAGE_LABEL_COLORS[label] ?? "#64748b";
        const els: React.ReactNode[] = [
          <div key={`h-${i}`} style={{ width: CARD_W }} className="flex justify-center px-1">
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              {label}
            </span>
          </div>,
        ];
        if (i < labels.length - 1) {
          els.push(<div key={`g-${i}`} style={{ width: CONN_W }} />);
        }
        return els;
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoadToFinal() {
  const { tournament } = useApp();
  const all = tournament.knockoutBracket.matches;

  const finalMatch = all.find((m) => m.stage === "Final");
  const leftSf     = all.find((m) => m.nextMatchId === finalMatch?.id && m.nextSlot === "home");
  const rightSf    = all.find((m) => m.nextMatchId === finalMatch?.id && m.nextSlot === "away");
  const totalW     = 2 * (4 * CARD_W + 3 * CONN_W) + CARD_W;

  const leftHeaders  = ["שלב 32", "שמינית גמר", "רביע גמר", "חצי גמר"];
  const rightHeaders = ["חצי גמר", "רביע גמר", "שמינית גמר", "שלב 32"];

  return (
    <div className="px-4">
      {/* Bracket scroll area */}
      <div className="relative">
        <div
          className="overflow-x-auto no-scrollbar pb-4"
          dir="ltr"
          style={{
            background: "linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%)",
            borderRadius: "20px",
            padding: "16px 12px 20px",
            border: "1px solid #dde8f7",
            boxShadow: "0 4px 20px rgba(14,30,64,.06)",
          }}
        >
          <div className="flex flex-row items-start" style={{ minWidth: totalW }}>
            {/* Left half */}
            <div className="shrink-0">
              <HeaderRow labels={leftHeaders} />
              <Half sfId={leftSf?.id} flip={false} all={all} />
            </div>

            {/* Final */}
            <div className="shrink-0 flex flex-col items-center" style={{ width: CARD_W }}>
              <div className="mb-2">
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full"
                  style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #f59e0b50" }}
                >
                  🏆 גמר
                </span>
              </div>
              <div
                className="flex items-center px-0.5"
                style={{ height: 8 * UNIT, width: CARD_W }}
              >
                {finalMatch && <MatchCard match={finalMatch} />}
              </div>
            </div>

            {/* Right half */}
            <div className="shrink-0">
              <HeaderRow labels={rightHeaders} />
              <Half sfId={rightSf?.id} flip={true} all={all} />
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <p className="text-center text-[9px] text-[#94a3b8] mt-2 font-medium tracking-wide">
          ← גלול לצפייה בעץ הטורניר המלא →
        </p>
      </div>
    </div>
  );
}
