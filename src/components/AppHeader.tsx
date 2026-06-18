"use client";

import { useApp } from "@/components/AppContext";

const USE_MOCK             = process.env.NEXT_PUBLIC_USE_MOCK_DATA              !== "false";
const ALLOW_MANUAL_REFRESH = process.env.NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH   !== "false";

// ── AppHeader ─────────────────────────────────────────────────────────────────

export function AppHeader() {
  const { syncInProgress, lastSyncAt, syncError, manualSync, rateLimited } = useApp();

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
          {/* Trophy image with glow */}
          <div
            style={{
              flexShrink: 0,
              filter:
                "drop-shadow(0 0 18px rgba(251,191,36,0.70))" +
                " drop-shadow(0 6px 16px rgba(0,0,0,0.55))",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/wc-trophy.png"
              alt=""
              aria-hidden
              style={{ height: "107px", width: "auto", display: "block" }}
            />
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
