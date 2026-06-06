"use client";

import { useState, useEffect, useId, type ComponentType } from "react";
import { useApp } from "@/components/AppContext";
import { CanadaFlag, USAFlag, MexicoFlag } from "@/components/HostFlags";

const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK_DATA              !== "false";
const ALLOW_MANUAL_REFRESH = process.env.NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH   !== "false";

// ─────────────────────────────────────────────────────────────────────────────
// SVG World Cup Trophy
// ─────────────────────────────────────────────────────────────────────────────

function SVGTrophy({ height = 160 }: { height?: number }) {
  const uid = useId();
  const w   = Math.round(height * 78 / 128);

  const idHalo  = `${uid}h`;
  const idGold  = `${uid}g`;
  const idGlobe = `${uid}gl`;

  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 78 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Halo glow behind the trophy */}
        <radialGradient id={idHalo} cx="50%" cy="32%" r="60%">
          <stop offset="0%"   stopColor="rgba(251,191,36,0.95)" />
          <stop offset="30%"  stopColor="rgba(251,191,36,0.72)" />
          <stop offset="58%"  stopColor="rgba(251,191,36,0.28)" />
          <stop offset="82%"  stopColor="rgba(251,191,36,0.07)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </radialGradient>

        {/* Metallic gold — horizontal shimmer */}
        <linearGradient id={idGold} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6b3208" />
          <stop offset="14%"  stopColor="#c2670a" />
          <stop offset="30%"  stopColor="#f5c842" />
          <stop offset="46%"  stopColor="#fef3c7" />
          <stop offset="54%"  stopColor="#ffffff" />
          <stop offset="70%"  stopColor="#f5c842" />
          <stop offset="86%"  stopColor="#c2670a" />
          <stop offset="100%" stopColor="#6b3208" />
        </linearGradient>

        {/* Globe — bright top-left spot fading to dark */}
        <radialGradient id={idGlobe} cx="34%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#fffbeb" />
          <stop offset="28%"  stopColor="#fde68a" />
          <stop offset="60%"  stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>

      {/* ── Halo ── */}
      <ellipse cx="39" cy="28" rx="46" ry="58" fill={`url(#${idHalo})`} />

      {/* ── Body (drawn first; globe is rendered on top to cap it cleanly) ── */}
      <path
        d={`
          M 28,30
          C 24,37 21,47 21,56
          C 21,63 23,69 25,75
          L 28,91
          L 28,101
          L 24,107
          L 17,113
          L 13,119
          L 13,125
          L 65,125
          L 65,119
          L 61,113
          L 54,107
          L 50,101
          L 50,91
          L 53,75
          C 55,69 57,63 57,56
          C 57,47 54,37 50,30
          Z
        `}
        fill={`url(#${idGold})`}
      />

      {/* Centre highlight stripe */}
      <path
        d="M 37,34 L 37,90 L 38,101"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Base step edge highlights */}
      <line x1="17" y1="113" x2="61" y2="113" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" />
      <line x1="13" y1="119" x2="65" y2="119" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />

      {/* ── Arms ── */}
      <path
        d="M 21,56 C 8,54 2,43 7,33 C 12,24 21,22 28,30"
        stroke={`url(#${idGold})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 57,56 C 70,54 76,43 71,33 C 66,24 57,22 50,30"
        stroke={`url(#${idGold})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Globe ── */}
      <circle cx="39" cy="20" r="16" fill={`url(#${idGlobe})`} />
      {/* Equator */}
      <ellipse cx="39" cy="20" rx="16" ry="5.2"
               fill="none" stroke="rgba(120,53,15,0.52)" strokeWidth="0.75" />
      {/* Upper latitude */}
      <ellipse cx="39" cy="13" rx="11.5" ry="3.8"
               fill="none" stroke="rgba(120,53,15,0.38)" strokeWidth="0.55" />
      {/* Lower latitude */}
      <ellipse cx="39" cy="27" rx="11.5" ry="3.8"
               fill="none" stroke="rgba(120,53,15,0.38)" strokeWidth="0.55" />
      {/* Left meridian arc */}
      <path d="M 39,4 Q 27,12 27,20 Q 27,28 39,36"
            fill="none" stroke="rgba(120,53,15,0.40)" strokeWidth="0.65" />
      {/* Right meridian arc */}
      <path d="M 39,4 Q 51,12 51,20 Q 51,28 39,36"
            fill="none" stroke="rgba(120,53,15,0.40)" strokeWidth="0.65" />
      {/* Specular highlight */}
      <ellipse
        cx="31" cy="13.5" rx="5.2" ry="3.3"
        fill="rgba(255,255,255,0.55)"
        transform="rotate(-38 31 13.5)"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile breakpoint hook
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return mobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// FlagTile — flag card (4:3 SVG) + country label below
// ─────────────────────────────────────────────────────────────────────────────

type FlagComponent = ComponentType<{ width?: number }>;

function FlagTile({ Flag, name, flagWidth = 78 }: { Flag: FlagComponent; name: string; flagWidth?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          borderRadius: "9px",
          overflow: "hidden",
          border: "1.5px solid rgba(255,255,255,0.28)",
          boxShadow:
            "0 3px 14px rgba(0,0,0,0.50)," +
            "0 1px 4px rgba(0,0,0,0.35)," +
            "inset 0 1px 0 rgba(255,255,255,0.10)",
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <Flag width={flagWidth} />
      </div>
      <span
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: ".05em",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorldCupHeroHeader
// ─────────────────────────────────────────────────────────────────────────────

export function WorldCupHeroHeader() {
  const { syncInProgress, lastSyncAt, syncError, manualSync, rateLimited } = useApp();
  const isMobile = useIsMobile();

  const showSyncBar = !USE_MOCK;

  function fmtTime(ms: number) {
    return new Date(ms).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <header
      dir="ltr"
      className="shrink-0"
      style={{
        background:
          "radial-gradient(ellipse 65% 130% at 50% 105%, rgba(251,191,36,0.11) 0%, transparent 60%)," +
          "linear-gradient(160deg, #040c20 0%, #0a1840 22%, #112050 42%, #0a1840 75%, #040c20 100%)",
      }}
    >
      {/* ── Main hero row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "10px 12px 8px" : "28px 20px 24px",
          gap: isMobile ? "10px" : "20px",
          minHeight: isMobile ? undefined : "152px",
        }}
      >
        {/* ── Host nation flag tiles ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: isMobile ? "5px" : "8px",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <FlagTile Flag={CanadaFlag} name="קנדה"   flagWidth={isMobile ? 44 : 78} />
          <FlagTile Flag={USAFlag}    name='ארה"ב'  flagWidth={isMobile ? 44 : 78} />
          <FlagTile Flag={MexicoFlag} name="מקסיקו" flagWidth={isMobile ? 44 : 78} />
        </div>

        {/* ── Vertical separator ─────────────────────────────────────── */}
        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            margin: isMobile ? "2px 4px" : "4px 8px",
            background:
              "linear-gradient(to bottom," +
              "transparent 0%," +
              "rgba(255,255,255,0.30) 20%," +
              "rgba(255,255,255,0.30) 80%," +
              "transparent 100%)",
            flexShrink: 0,
          }}
        />

        {/* ── Trophy + wordmark ─────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: isMobile ? "10px" : "22px",
            minWidth: 0,
            paddingBottom: isMobile ? "2px" : "4px",
          }}
        >
          {/* ── Trophy SVG ───────────────────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              filter:
                "drop-shadow(0 0 20px rgba(251,191,36,0.82))" +
                " drop-shadow(0 8px 22px rgba(0,0,0,0.55))",
            }}
          >
            <SVGTrophy height={isMobile ? 80 : 160} />
          </div>

          {/* ── Wordmark ─────────────────────────────────────────────── */}
          <div style={{ minWidth: 0, flexShrink: 1, paddingBottom: isMobile ? "2px" : "6px" }}>
            <p
              style={{
                fontSize: isMobile ? "clamp(17px,4.5vw,22px)" : "clamp(32px, 6.5vw, 48px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                lineHeight: 1.0,
                whiteSpace: "nowrap",
                textShadow: "0 2px 20px rgba(0,0,0,0.65)",
              }}
            >
              מונדיאל 2026
            </p>
            <p
              style={{
                fontSize: isMobile ? "9px" : "clamp(13px, 1.8vw, 16px)",
                fontWeight: 600,
                color: "rgba(147,197,253,0.78)",
                letterSpacing: "0.06em",
                marginTop: isMobile ? "4px" : "10px",
                whiteSpace: "nowrap",
              }}
            >
              מרכז המידע הרשמי
            </p>
          </div>
        </div>

        {/* ── Hamburger ──────────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "8px 4px",
          }}
          aria-label="תפריט"
        >
          {([24, 16, 24] as const).map((w, i) => (
            <span
              key={i}
              style={{
                display: "block",
                width: `${w}px`,
                height: "3px",
                borderRadius: "2px",
                background:
                  i === 1
                    ? "rgba(255,255,255,0.48)"
                    : "rgba(255,255,255,0.76)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Manual sync bar (live / API mode only) ──────────────────── */}
      {showSyncBar && (
        <div
          className="flex items-center justify-between px-5 py-1.5 gap-3"
          style={{
            background: "rgba(0,0,0,0.30)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="min-w-0 flex-1" dir="rtl">
            {rateLimited ? (
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
          height: "3px",
          background:
            "linear-gradient(to right," +
            "transparent 0%," +
            "#78350f 6%," +
            "#d97706 18%," +
            "#f59e0b 32%," +
            "#ffe066 50%," +
            "#f59e0b 68%," +
            "#d97706 82%," +
            "#78350f 94%," +
            "transparent 100%)",
        }}
      />
    </header>
  );
}
