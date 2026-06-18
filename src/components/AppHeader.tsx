"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/components/AppContext";

const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK_DATA              === "true";
const ALLOW_MANUAL_REFRESH = process.env.NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH   !== "false";

// ── FIFA World Cup Trophy ─────────────────────────────────────────────────────
// Shape: globe at the top supported by two arching figures, gold base
// viewBox 0 0 56 70 — displayed at 86×107

function WCTrophy() {
  return (
    <svg
      width="86"
      height="107"
      viewBox="0 0 56 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="tg" x1="5%" y1="0%" x2="95%" y2="100%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="22%"  stopColor="#fcd34d" />
          <stop offset="58%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="ts" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="50%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <radialGradient id="tgr" cx="36%" cy="30%" r="68%">
          <stop offset="0%"   stopColor="#fef9c3" />
          <stop offset="42%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>

      {/* ── Left support figure ── */}
      <path
        d="M13 27 C5 36 4 48 8 56 L14 56 C10 48 11 36 19 28 Z"
        fill="url(#ts)"
      />

      {/* ── Right support figure (mirror of left around x=28) ── */}
      <path
        d="M43 27 C51 36 52 48 48 56 L42 56 C46 48 45 36 37 28 Z"
        fill="url(#ts)"
      />

      {/* ── Globe ── */}
      <circle cx="28" cy="15" r="13" fill="url(#tgr)" />

      {/* Globe geographic lines */}
      <ellipse cx="28" cy="15" rx="13" ry="4.2"
               fill="none" stroke="rgba(120,53,15,0.14)" strokeWidth="0.75" />
      <ellipse cx="28" cy="15" rx="8"   ry="13"
               fill="none" stroke="rgba(120,53,15,0.10)" strokeWidth="0.65" />

      {/* Globe shine */}
      <circle cx="21" cy="9"  r="4.5" fill="rgba(255,255,255,0.28)" />
      <circle cx="22" cy="10" r="1.8" fill="rgba(255,255,255,0.48)" />

      {/* Globe right inner shadow */}
      <path d="M36 6 C39 10 39 20 37 25"
            stroke="rgba(120,53,15,0.14)" strokeWidth="2.5"
            strokeLinecap="round" fill="none" />

      {/* Star emblem */}
      <text x="28" y="19.5" textAnchor="middle" fontSize="9"
            fill="rgba(255,255,255,0.55)">★</text>

      {/* ── Base ── */}

      {/* Collar band */}
      <rect x="7"  y="56" width="42" height="4.5" rx="2.25" fill="url(#ts)" />

      {/* Green malachite accent */}
      <rect x="5"  y="60.5" width="46" height="2.5"  rx="1.25" fill="#166534" opacity="0.82" />

      {/* Main base plinth */}
      <rect x="2"  y="63"   width="52" height="8"    rx="4"    fill="url(#tg)" />
      <rect x="6"  y="64.5" width="44" height="1.8"  rx="0.9"  fill="rgba(255,255,255,0.28)" />

      {/* Foot */}
      <rect x="0"  y="71"   width="56" height="4.5"  rx="2.25" fill="url(#ts)" />
      <rect x="4"  y="72"   width="48" height="1.5"  rx="0.75" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

// ── AppHeader ─────────────────────────────────────────────────────────────────

export function AppHeader() {
  const { syncInProgress, lastSyncAt, syncError, manualSync, rateLimited } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const showSyncBar = !USE_MOCK;

  function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  const FLAGS = [
    { emoji: "🇨🇦", label: "קנדה" },
    { emoji: "🇺🇸", label: "ארצות הברית" },
    { emoji: "🇲🇽", label: "מקסיקו" },
  ];

  return (
    <header
      dir="ltr"
      className="shrink-0"
      style={{
        background:
          "linear-gradient(160deg," +
          "#060f26 0%," +
          "#0b1c48 25%," +
          "#112460 50%," +
          "#0b1c48 75%," +
          "#060f26 100%)",
      }}
    >
      {/* ── Main broadcast row ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "18px 18px 16px",
          gap: "12px",
        }}
      >
        {/* ── Host-country flags: three boxes side by side ─────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "6px",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {FLAGS.map(({ emoji, label }) => (
            <div
              key={label}
              title={label}
              style={{
                width: "52px",
                height: "40px",
                borderRadius: "9px",
                background: "rgba(255,255,255,0.09)",
                border: "1.5px solid rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                lineHeight: 1,
                boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                flexShrink: 0,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* ── Vertical separator ────────────────────────────────────── */}
        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            margin: "3px 2px",
            background:
              "linear-gradient(to bottom," +
              "transparent 0%," +
              "rgba(255,255,255,0.28) 20%," +
              "rgba(255,255,255,0.28) 80%," +
              "transparent 100%)",
            flexShrink: 0,
          }}
        />

        {/* ── Trophy + wordmark ─────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            minWidth: 0,
          }}
        >
          {/* Trophy with glow */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Radial glow disc */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-16px",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse 85% 80% at 50% 54%," +
                  "rgba(251,191,36,0.40) 0%," +
                  "rgba(251,191,36,0.12) 55%," +
                  "transparent 100%)",
                pointerEvents: "none",
              }}
            />
            {/* Drop-shadow filter */}
            <div
              style={{
                filter:
                  "drop-shadow(0 0 22px rgba(251,191,36,0.72))" +
                  " drop-shadow(0 0 8px  rgba(251,191,36,0.40))" +
                  " drop-shadow(0 5px 14px rgba(0,0,0,0.65))",
                position: "relative",
              }}
            >
              <WCTrophy />
            </div>
          </div>

          {/* Title block */}
          <div style={{ minWidth: 0, flexShrink: 1 }}>
            <p
              style={{
                fontSize: "clamp(24px, 5vw, 42px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.025em",
                lineHeight: 1.0,
                whiteSpace: "nowrap",
                textShadow: "0 2px 12px rgba(0,0,0,0.55)",
              }}
            >
              מונדיאל 2026
            </p>
            <p
              style={{
                fontSize: "clamp(10px, 1.5vw, 14px)",
                fontWeight: 500,
                color: "rgba(147,197,253,0.65)",
                letterSpacing: "0.04em",
                marginTop: "5px",
                whiteSpace: "nowrap",
              }}
            >
              מרכז המידע הרשמי
            </p>
          </div>
        </div>

        {/* ── Hamburger menu ────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "6px 4px",
          }}
          aria-label="תפריט"
        >
          {[22, 14, 22].map((w, i) => (
            <span
              key={i}
              style={{
                display: "block",
                width: `${w}px`,
                height: "2.5px",
                borderRadius: "2px",
                background:
                  i === 1
                    ? "rgba(255,255,255,0.48)"
                    : "rgba(255,255,255,0.75)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Sync bar (live / API mode only) ────────────────────────── */}
      {showSyncBar && (
        <div
          className="flex items-center justify-between px-5 py-1.5 gap-3"
          style={{
            background: "rgba(0,0,0,0.30)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="min-w-0 flex-1" dir="rtl">
            {!mounted ? (
              <p className="text-[10px] text-blue-300 leading-tight">
                לא סונכרן עדיין
              </p>
            ) : rateLimited ? (
              <p className="text-[10px] font-bold text-red-300 leading-tight truncate">
                🔴 מכסת API יומית נוצלה. מוצגים נתונים שמורים/מוקאפ.
              </p>
            ) : syncError ? (
              <p className="text-[10px] font-bold text-amber-300 leading-tight truncate">
                ⚠️ {syncError}
              </p>
            ) : lastSyncAt ? (
              <p className="text-[10px] text-blue-200 leading-tight">
                עודכן: {fmtTime(lastSyncAt)}
              </p>
            ) : (
              <p className="text-[10px] text-blue-300 leading-tight">
                לא סונכרן עדיין
              </p>
            )}
          </div>

          {ALLOW_MANUAL_REFRESH && !rateLimited && (
            <button
              onClick={() => void manualSync()}
              disabled={syncInProgress}
              className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-opacity"
              style={{
                background: syncInProgress
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(59,130,246,0.35)",
                color: syncInProgress ? "rgba(255,255,255,0.35)" : "#bfdbfe",
                border: "1px solid rgba(147,197,253,0.28)",
              }}
            >
              {syncInProgress ? "⏳" : "🔄"} רענן נתונים מה-API
            </button>
          )}
        </div>
      )}

      {/* ── Gold shimmer accent line ─────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          height: "2px",
          background:
            "linear-gradient(to right," +
            "transparent 0%," +
            "#78350f 6%," +
            "#d97706 18%," +
            "#f59e0b 32%," +
            "#fcd34d 50%," +
            "#f59e0b 68%," +
            "#d97706 82%," +
            "#78350f 94%," +
            "transparent 100%)",
        }}
      />
    </header>
  );
}
