"use client";

import { useState, useEffect, type ComponentType } from "react";
import { useApp } from "@/components/AppContext";
import { CanadaFlag, USAFlag, MexicoFlag } from "@/components/HostFlags";

const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK_DATA              !== "false";
const ALLOW_MANUAL_REFRESH = process.env.NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH   !== "false";

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
          {/* ── Trophy image ─────────────────────────────────────────── */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/* Soft golden glow disc behind the trophy */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "130%",
                height: "130%",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse 65% 78% at 50% 54%," +
                  "rgba(251,191,36,0.42) 0%," +
                  "rgba(251,191,36,0.16) 46%," +
                  "transparent 72%)",
                filter: "blur(10px)",
                pointerEvents: "none",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/world-cup-trophy.png"
              alt=""
              aria-hidden
              style={{
                height: isMobile ? "110px" : "205px",
                width: "auto",
                display: "block",
                position: "relative",
                filter:
                  "drop-shadow(0 0 22px rgba(251,191,36,0.55))" +
                  " drop-shadow(0 6px 18px rgba(0,0,0,0.60))",
              }}
            />
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
