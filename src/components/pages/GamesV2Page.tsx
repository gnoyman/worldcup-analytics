"use client";

import { useState, useMemo } from "react";
import { useApp, type DataSource } from "@/components/AppContext";
import type { Match, Team } from "@/types";

// ─── Per-group accent colours ─────────────────────────────────────────────────

const GC: Record<string, string> = {
  A: "#38bdf8", B: "#34d399", C: "#c084fc", D: "#fb923c",
  E: "#fb7185", F: "#22d3ee", G: "#fbbf24", H: "#818cf8",
  I: "#2dd4bf", J: "#a3e635", K: "#f472b6", L: "#60a5fa",
};

function gc(id: string) { return GC[id] ?? "#94a3b8"; }

// ─── Source badge config ──────────────────────────────────────────────────────

const SRC: Record<DataSource, { dot: string; label: string }> = {
  live:         { dot: "🟢", label: "Live" },
  openfootball: { dot: "🟢", label: "OpenFootball" },
  mock:         { dot: "🟡", label: "Mock" },
  error:        { dot: "🔴", label: "Error" },
  loading:      { dot: "⏳", label: "Loading" },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function fmtFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(`${y}-${m}-${d}`);
  return `${DAYS[dt.getDay()]}, ${+d} ${MONTHS[+m - 1]}`;
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${+d}/${+m}`;
}

function fmtSync(ms: number): string {
  const dt = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <p style={{
        fontSize: "10px", fontWeight: 900,
        color: "rgba(255,255,255,.4)",
        textTransform: "uppercase", letterSpacing: ".15em",
        margin: 0, whiteSpace: "nowrap",
      }}>
        {children}
      </p>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,.07)" }} />
    </div>
  );
}

// ─── Stat counter pill ────────────────────────────────────────────────────────

function CounterPill({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div style={{
      flex: 1,
      background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: "18px",
      padding: "16px 8px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {accent && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <p style={{
        fontSize: "clamp(24px,6vw,30px)",
        fontWeight: 900, lineHeight: 1, margin: 0,
        color: accent ?? "#fff",
      }}>
        {value}
      </p>
      <p style={{
        fontSize: "8px", fontWeight: 700,
        color: "rgba(255,255,255,.35)",
        textTransform: "uppercase", letterSpacing: ".12em",
        margin: "5px 0 0",
      }}>
        {label}
      </p>
    </div>
  );
}

// ─── Full match card (Today section) ─────────────────────────────────────────

function MatchCard({ m, findTeam }: { m: Match; findTeam: (id: string) => Team | null }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const done = m.status === "played";
  const hw   = done && (m.homeScore ?? 0) > (m.awayScore ?? 0);
  const aw   = done && (m.awayScore ?? 0) > (m.homeScore ?? 0);
  const draw = done && m.homeScore === m.awayScore;
  const ac   = gc(m.groupId);

  return (
    <div style={{
      background: "rgba(255,255,255,.05)",
      border: "1px solid rgba(255,255,255,.09)",
      borderRadius: "22px",
      overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,.35)",
    }}>
      {/* Group colour accent bar */}
      <div style={{
        height: "3px",
        background: `linear-gradient(90deg, ${ac}44 0%, ${ac} 100%)`,
      }} />

      {/* Teams + score */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "20px 16px 16px", gap: "12px",
      }}>
        {/* Home team — right side in RTL */}
        <div style={{
          flex: 1,
          display: "flex", alignItems: "center",
          justifyContent: "flex-end", gap: "10px",
          opacity: done && !hw && !draw ? 0.3 : 1,
          transition: "opacity .2s",
        }}>
          <span style={{
            fontSize: "14px", fontWeight: hw ? 800 : 500,
            color: hw ? "#fff" : "rgba(255,255,255,.75)",
            textAlign: "right", lineHeight: 1.3,
          }}>
            {h.name}
          </span>
          <span style={{
            fontSize: "40px", lineHeight: 1, flexShrink: 0,
            filter: "drop-shadow(0 3px 8px rgba(0,0,0,.5))",
          }}>
            {h.flag}
          </span>
        </div>

        {/* Score / time badge */}
        {done ? (
          <div style={{
            flexShrink: 0, minWidth: "84px",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "6px",
            background: "#060e2a",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: "16px",
            padding: "12px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)",
            direction: "ltr",
          }}>
            <span style={{
              fontSize: "24px", fontWeight: 900, lineHeight: 1,
              color: hw ? "#fbbf24" : draw ? "#fff" : "rgba(255,255,255,.25)",
            }}>
              {m.homeScore}
            </span>
            <span style={{ fontSize: "15px", color: "rgba(255,255,255,.2)" }}>–</span>
            <span style={{
              fontSize: "24px", fontWeight: 900, lineHeight: 1,
              color: aw ? "#fbbf24" : draw ? "#fff" : "rgba(255,255,255,.25)",
            }}>
              {m.awayScore}
            </span>
          </div>
        ) : (
          <div style={{
            flexShrink: 0, minWidth: "72px",
            textAlign: "center",
            background: `${ac}18`,
            border: `1px solid ${ac}38`,
            borderRadius: "16px",
            padding: "12px 14px",
            fontSize: "16px", fontWeight: 900, color: ac,
          }}>
            {m.time ?? "vs"}
          </div>
        )}

        {/* Away team — left side in RTL */}
        <div style={{
          flex: 1,
          display: "flex", alignItems: "center",
          gap: "10px",
          opacity: done && !aw && !draw ? 0.3 : 1,
          transition: "opacity .2s",
        }}>
          <span style={{
            fontSize: "40px", lineHeight: 1, flexShrink: 0,
            filter: "drop-shadow(0 3px 8px rgba(0,0,0,.5))",
          }}>
            {a.flag}
          </span>
          <span style={{
            fontSize: "14px", fontWeight: aw ? 800 : 500,
            color: aw ? "#fff" : "rgba(255,255,255,.75)",
            lineHeight: 1.3,
          }}>
            {a.name}
          </span>
        </div>
      </div>

      {/* Footer meta */}
      <div style={{
        display: "flex", alignItems: "center", flexWrap: "wrap",
        justifyContent: "space-between", gap: "6px",
        padding: "10px 16px 14px",
        borderTop: "1px solid rgba(255,255,255,.05)",
      }}>
        {/* Group chip */}
        <span style={{
          fontSize: "10px", fontWeight: 700,
          color: ac,
          background: `${ac}18`,
          border: `1px solid ${ac}30`,
          padding: "3px 10px", borderRadius: "999px",
        }}>
          Group {m.groupId}
        </span>

        {/* Venue */}
        {m.venue && (
          <span style={{
            fontSize: "10px", fontWeight: 600,
            color: "rgba(255,255,255,.35)",
            display: "flex", alignItems: "center", gap: "4px",
            flex: 1, minWidth: 0, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
            justifyContent: "center",
          }}>
            📍 {m.venue}
          </span>
        )}

        {/* Status */}
        <span style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "10px", fontWeight: 700,
          color: done ? "#4ade80" : "rgba(255,255,255,.35)",
        }}>
          <span style={{
            display: "block", width: "6px", height: "6px",
            borderRadius: "50%",
            background: done ? "#4ade80" : ac,
          }} />
          {done ? "הסתיים" : `מחזור ${m.matchDay}`}
        </span>
      </div>
    </div>
  );
}

// ─── No-matches-today empty state ─────────────────────────────────────────────

function NoTodayGames({ nextDate }: { nextDate: string | null }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: "22px",
      padding: "36px 20px",
      textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
    }}>
      <span style={{
        fontSize: "56px", lineHeight: 1,
        filter: "drop-shadow(0 6px 20px rgba(251,191,36,.25))",
      }}>
        ⚽
      </span>
      <p style={{
        fontSize: "18px", fontWeight: 900,
        color: "rgba(255,255,255,.85)", margin: 0,
      }}>
        אין משחקים היום
      </p>
      {nextDate && (
        <p style={{
          fontSize: "12px", fontWeight: 500,
          color: "rgba(255,255,255,.35)", margin: 0,
        }}>
          המשחק הבא: {fmtFull(nextDate)}
        </p>
      )}
    </div>
  );
}

// ─── Upcoming fixture row ─────────────────────────────────────────────────────

function FixtureRow({
  m, findTeam, isLast,
}: { m: Match; findTeam: (id: string) => Team | null; isLast: boolean }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const ac = gc(m.groupId);

  return (
    <div style={{
      padding: "0",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)",
    }}>
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "13px 16px 6px",
    }}>
      {/* Kick-off time */}
      <span style={{
        fontSize: "12px", fontWeight: 800,
        color: ac,
        minWidth: "44px", flexShrink: 0,
      }}>
        {m.time ?? "—"}
      </span>

      {/* Home (right in RTL) */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center",
        justifyContent: "flex-end", gap: "7px",
      }}>
        <span style={{
          fontSize: "12px", fontWeight: 600,
          color: "rgba(255,255,255,.82)",
          textAlign: "right",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {h.name}
        </span>
        <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
      </div>

      {/* VS divider */}
      <span style={{
        fontSize: "9px", fontWeight: 900,
        color: "rgba(255,255,255,.18)",
        flexShrink: 0, padding: "0 2px",
      }}>
        vs
      </span>

      {/* Away (left in RTL) */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", gap: "7px",
      }}>
        <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
        <span style={{
          fontSize: "12px", fontWeight: 600,
          color: "rgba(255,255,255,.82)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {a.name}
        </span>
      </div>

      {/* Group badge */}
      <span style={{
        fontSize: "9px", fontWeight: 700,
        color: ac, flexShrink: 0,
      }}>
        G{m.groupId}
      </span>
    </div>
    {/* Venue sub-row */}
    {m.venue && (
      <div style={{
        padding: "0 16px 9px",
        display: "flex", alignItems: "center", gap: "4px",
      }}>
        <span style={{ fontSize: "9px", color: "rgba(255,255,255,.25)" }}>📍</span>
        <span style={{
          fontSize: "9px", color: "rgba(255,255,255,.25)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {m.venue}
        </span>
      </div>
    )}
    </div>
  );
}

// ─── Recent result row ────────────────────────────────────────────────────────

function ResultRow({
  m, findTeam, isLast,
}: { m: Match; findTeam: (id: string) => Team | null; isLast: boolean }) {
  const h = findTeam(m.homeTeamId);
  const a = findTeam(m.awayTeamId);
  if (!h || !a) return null;

  const hw   = (m.homeScore ?? 0) > (m.awayScore ?? 0);
  const aw   = (m.awayScore ?? 0) > (m.homeScore ?? 0);
  const draw = m.homeScore === m.awayScore;
  const ac   = gc(m.groupId);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,.04)",
    }}>
      {/* Home */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center",
        justifyContent: "flex-end", gap: "7px",
        opacity: done(hw, draw) ? 1 : 0.3,
      }}>
        <span style={{
          fontSize: "12px", fontWeight: hw ? 700 : 500,
          color: hw ? "#fff" : "rgba(255,255,255,.75)",
          textAlign: "right",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {h.name}
        </span>
        <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>{h.flag}</span>
      </div>

      {/* Score */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: "3px",
        background: "rgba(0,0,0,.35)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: "9px",
        padding: "4px 12px",
        direction: "ltr",
      }}>
        <span style={{
          fontSize: "14px", fontWeight: 900,
          color: hw ? "#fbbf24" : draw ? "#fff" : "rgba(255,255,255,.3)",
        }}>
          {m.homeScore}
        </span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,.18)" }}>–</span>
        <span style={{
          fontSize: "14px", fontWeight: 900,
          color: aw ? "#fbbf24" : draw ? "#fff" : "rgba(255,255,255,.3)",
        }}>
          {m.awayScore}
        </span>
      </div>

      {/* Away */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", gap: "7px",
        opacity: done(aw, draw) ? 1 : 0.3,
      }}>
        <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>{a.flag}</span>
        <span style={{
          fontSize: "12px", fontWeight: aw ? 700 : 500,
          color: aw ? "#fff" : "rgba(255,255,255,.75)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {a.name}
        </span>
      </div>

      {/* Group + date + venue */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "flex-end", flexShrink: 0, gap: "2px",
      }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: ac }}>G{m.groupId}</span>
        <span style={{
          fontSize: "8px", fontWeight: 600,
          color: "rgba(255,255,255,.22)", direction: "ltr",
        }}>
          {m.date.slice(5).replace("-", "/")}
        </span>
        {m.venue && (
          <span style={{
            fontSize: "8px", color: "rgba(255,255,255,.18)",
            maxWidth: "80px", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
            textAlign: "right",
          }}>
            {m.venue}
          </span>
        )}
      </div>
    </div>
  );
}

function done(won: boolean, draw: boolean) { return won || draw; }

// ─── Main export ──────────────────────────────────────────────────────────────

export function GamesV2Page() {
  const { tournament, dataSource, teamsById, lastSyncAt } = useApp();

  const allTeams = tournament.groups.flatMap(g => g.teams);

  function find(id: string): Team | null {
    return teamsById.get(id) ?? allTeams.find(t => t.id === id) ?? null;
  }

  const today     = new Date().toISOString().slice(0, 10);
  const total     = tournament.matches.length;
  const nPlayed   = tournament.matches.filter(m => m.status === "played").length;
  const nLeft     = total - nPlayed;

  const todayMatches = useMemo(() =>
    tournament.matches
      .filter(m => m.date === today)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [tournament.matches, today]
  );

  const futureDateMap = useMemo(() => {
    const map = new Map<string, Match[]>();
    tournament.matches
      .filter(m => m.status === "unplayed" && m.date > today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
      .forEach(m => {
        if (!map.has(m.date)) map.set(m.date, []);
        map.get(m.date)!.push(m);
      });
    return map;
  }, [tournament.matches, today]);

  const futureDates = [...futureDateMap.keys()].slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = futureDates.includes(selectedDate ?? "")
    ? selectedDate!
    : (futureDates[0] ?? null);

  const recentResults = useMemo(() =>
    tournament.matches
      .filter(m => m.status === "played")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12),
    [tournament.matches]
  );

  const src = SRC[dataSource];

  return (
    <div style={{
      background: "linear-gradient(160deg, #060e2a 0%, #0a1628 50%, #06101f 100%)",
      minHeight: "100vh",
      paddingBottom: "100px",
    }}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg,#060e2a 0%,#0d1b3e 100%)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
        padding: "20px 16px 18px",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "4px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "26px", lineHeight: 1 }}>⚽</span>
            <h1 style={{
              fontSize: "26px", fontWeight: 900, color: "#fff",
              margin: 0, letterSpacing: "-0.02em",
            }}>
              משחקים
            </h1>
          </div>

          {/* Data source badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", borderRadius: "999px",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.11)",
            fontSize: "10px", fontWeight: 700,
            color: "rgba(255,255,255,.55)",
          }}>
            {src.dot} {src.label}
          </span>
        </div>

        <p style={{
          fontSize: "10px", fontWeight: 700,
          color: "rgba(147,197,253,.4)",
          letterSpacing: ".15em", textTransform: "uppercase",
          margin: "0 0 10px",
        }}>
          FIFA World Cup 2026 · מונדיאל 2026
        </p>

        {lastSyncAt && (
          <p style={{
            fontSize: "9px", fontWeight: 600,
            color: "rgba(255,255,255,.22)",
            margin: "0 0 12px", direction: "ltr", textAlign: "right",
          }}>
            עודכן: {fmtSync(lastSyncAt)}
          </p>
        )}

        <div style={{
          width: "32px", height: "3px", borderRadius: "3px",
          background: "linear-gradient(to right,#f59e0b,#f97316)",
        }} />
      </div>

      {/* ── BODY ─────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 16px 0",
        display: "flex", flexDirection: "column", gap: "26px",
      }}>

        {/* ── STAT STRIP ──────────────────────────────── */}
        <div style={{ display: "flex", gap: "10px" }}>
          <CounterPill value={nPlayed} label="שוחקו"  accent="#38bdf8" />
          <CounterPill value={nLeft}   label="נותרו"  accent="#34d399" />
          <CounterPill value={total}   label="סה״כ" />
        </div>

        {/* ── TODAY ───────────────────────────────────── */}
        <section>
          <SectionHead>
            🔴 המשחקים היום · {fmtFull(today)}
          </SectionHead>

          {todayMatches.length === 0 ? (
            <NoTodayGames nextDate={futureDates[0] ?? null} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {todayMatches.map(m => (
                <MatchCard key={m.id} m={m} findTeam={find} />
              ))}
            </div>
          )}
        </section>

        {/* ── UPCOMING ────────────────────────────────── */}
        {futureDates.length > 0 && (
          <section>
            <SectionHead>📆 משחקים קרובים</SectionHead>

            {/* Horizontal date-tab strip */}
            <div style={{
              display: "flex", gap: "8px",
              overflowX: "auto", paddingBottom: "4px",
              // hide scrollbar
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}>
              {futureDates.map(date => {
                const isActive = date === activeDate;
                const cnt = futureDateMap.get(date)!.length;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      flexShrink: 0,
                      padding: "9px 14px",
                      borderRadius: "14px",
                      border: isActive ? "none" : "1px solid rgba(255,255,255,.1)",
                      background: isActive
                        ? "linear-gradient(135deg,#f59e0b,#ea580c)"
                        : "rgba(255,255,255,.05)",
                      color: isActive ? "#fff" : "rgba(255,255,255,.4)",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "3px",
                      minWidth: "58px",
                      boxShadow: isActive ? "0 4px 16px rgba(245,158,11,.45)" : "none",
                      transition: "all .15s",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1 }}>
                      {fmtShort(date)}
                    </span>
                    <span style={{
                      fontSize: "8px", fontWeight: 700,
                      opacity: isActive ? 0.8 : 0.45,
                    }}>
                      {cnt} משחקים
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Fixture list for the active date */}
            {activeDate && futureDateMap.has(activeDate) && (
              <div style={{
                marginTop: "12px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: "20px",
                overflow: "hidden",
              }}>
                {/* Card date header */}
                <div style={{
                  padding: "11px 16px",
                  background: "rgba(255,255,255,.04)",
                  borderBottom: "1px solid rgba(255,255,255,.06)",
                }}>
                  <p style={{
                    fontSize: "11px", fontWeight: 800,
                    color: "rgba(255,255,255,.45)",
                    textTransform: "uppercase", letterSpacing: ".1em",
                    margin: 0,
                  }}>
                    {fmtFull(activeDate)}
                  </p>
                </div>

                {futureDateMap.get(activeDate)!.map((m, i, arr) => (
                  <FixtureRow
                    key={m.id}
                    m={m}
                    findTeam={find}
                    isLast={i === arr.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── RECENT RESULTS ──────────────────────────── */}
        {recentResults.length > 0 && (
          <section>
            <SectionHead>✅ תוצאות אחרונות</SectionHead>

            <div style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: "20px",
              overflow: "hidden",
            }}>
              {recentResults.map((m, i) => (
                <ResultRow
                  key={m.id}
                  m={m}
                  findTeam={find}
                  isLast={i === recentResults.length - 1}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
