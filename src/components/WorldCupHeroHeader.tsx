"use client";

import { useApp } from "@/components/AppContext";
import { CanadaFlag, USAFlag, MexicoFlag } from "@/components/HostFlags";

const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK_DATA              !== "false";
const ALLOW_MANUAL_REFRESH = process.env.NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH   !== "false";

// ─────────────────────────────────────────────────────────────────────────────
// FlagTile — flag card (4:3 SVG) + country label below
// ─────────────────────────────────────────────────────────────────────────────

type FlagComponent = React.ComponentType<{ width?: number }>;

function FlagTile({ Flag, name }: { Flag: FlagComponent; name: string }) {
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
        <Flag width={78} />
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
          padding: "28px 20px 24px",
          gap: "20px",
          minHeight: "152px",
        }}
      >
        {/* ── Host nation flag tiles ──────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "8px",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <FlagTile Flag={CanadaFlag} name="קנדה"   />
          <FlagTile Flag={USAFlag}    name='ארה"ב'  />
          <FlagTile Flag={MexicoFlag} name="מקסיקו" />
        </div>

        {/* ── Vertical separator ─────────────────────────────────────── */}
        <div
          style={{
            width: "1px",
            alignSelf: "stretch",
            margin: "4px 8px",
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
            gap: "22px",
            minWidth: 0,
            paddingBottom: "4px",
          }}
        >
          {/* ── Trophy photograph ────────────────────────────────────── */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {/*
              Spotlight disc: bright warm-white at centre fading through
              gold to transparent.  The photo's white background blends
              naturally into this bright core — no CSS blend-mode tricks
              needed.  The outer gold ring provides the championship glow.
            */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-40px",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse 72% 78% at 50% 42%," +
                  "rgba(255,248,210,0.94) 0%," +
                  "rgba(251,191,36,0.68) 38%," +
                  "rgba(251,191,36,0.28) 62%," +
                  "transparent 80%)",
                pointerEvents: "none",
              }}
            />

            {/* Depth shadow — applied outside the spotlight disc */}
            <div
              style={{
                position: "relative",
                filter:
                  "drop-shadow(0 0 22px rgba(251,191,36,0.75))" +
                  " drop-shadow(0 10px 28px rgba(0,0,0,0.80))",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/trophy.png"
                alt="FIFA World Cup Trophy"
                style={{
                  height: "160px",
                  width: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* ── Wordmark ─────────────────────────────────────────────── */}
          <div style={{ minWidth: 0, flexShrink: 1, paddingBottom: "6px" }}>
            <p
              style={{
                fontSize: "clamp(32px, 6.5vw, 48px)",
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
                fontSize: "clamp(13px, 1.8vw, 16px)",
                fontWeight: 600,
                color: "rgba(147,197,253,0.78)",
                letterSpacing: "0.06em",
                marginTop: "10px",
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
