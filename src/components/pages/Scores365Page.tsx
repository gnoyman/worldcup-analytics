"use client";

import { useEffect } from "react";

// ─── 365Scores widget constants ───────────────────────────────────────────────
const SCRIPT_SRC     = "https://widgets.365scores.com/main.js";
const COMPETITION_ID = "5930"; // מונדיאל (World Cup 2026)
const LANG           = "he-IL";

// ─── Widget container ─────────────────────────────────────────────────────────
// Each instance needs a unique data-widget-id; entity-type for a competition
// is "league" per the 365Scores widget consts (ENTITY_TYPES.competition = 'league').

interface WidgetContainerProps {
  widgetType: string;
  widgetId: string;
  scoresFilter?: string;
}

function WidgetContainer({ widgetType, widgetId, scoresFilter }: WidgetContainerProps) {
  return (
    <div
      data-widget-type={widgetType}
      data-entity-type="league"
      data-entity-id={COMPETITION_ID}
      data-lang={LANG}
      data-widget-id={widgetId}
      {...(scoresFilter ? { "data-scores-filter": scoresFilter } : {})}
    />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "20px 16px 10px",
        direction: "rtl",
      }}
    >
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 900,
          color: "#0f172a",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "linear-gradient(to left, #e2e8f0, transparent)",
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Scores365Page() {
  useEffect(() => {
    // Remove any stale script from a previous mount so the widget always
    // re-initializes into the freshly rendered container divs.
    document
      .querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
      .forEach((s) => s.remove());

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document
        .querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
        .forEach((s) => s.remove());
    };
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        background: "#f4f7fb",
        minHeight: "100vh",
        paddingBottom: "80px",
        overflowX: "hidden",
      }}
    >
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #edf2f7",
          padding: "18px 16px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <span style={{ fontSize: "24px" }}>🔴</span>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            לייב
          </h1>
        </div>
        <p
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          FIFA World Cup 2026 · תוצאות בזמן אמת
        </p>
        <div
          style={{
            height: "3px",
            width: "32px",
            borderRadius: "3px",
            background: "linear-gradient(to right, #ef4444, #f97316)",
            marginTop: "10px",
          }}
        />
      </div>

      {/* ── Section 1: Live Scores ────────────────────────────────────── */}
      <SectionHeader icon="⚽" title="תוצאות לייב" />
      <div
        style={{
          padding: "0 16px 4px",
          minHeight: "320px",
        }}
      >
        <WidgetContainer
          widgetType="entityScores"
          widgetId="wc26-live"
        />
      </div>

      {/* ── Section 2: Fixtures & Results ────────────────────────────── */}
      <SectionHeader icon="📅" title="לוח משחקים ותוצאות" />
      <div
        style={{
          padding: "0 16px 4px",
          minHeight: "400px",
        }}
      >
        <WidgetContainer
          widgetType="entityScores"
          widgetId="wc26-fixtures"
          scoresFilter="fixtures"
        />
      </div>

      {/* ── Section 3: Standings ──────────────────────────────────────── */}
      <SectionHeader icon="📊" title="טבלת דירוג" />
      <div
        style={{
          padding: "0 16px 4px",
          minHeight: "400px",
        }}
      >
        <WidgetContainer
          widgetType="entityStandings"
          widgetId="wc26-standings"
        />
      </div>

      {/* ── Attribution ───────────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px",
          textAlign: "center",
          fontSize: "11px",
          color: "#94a3b8",
        }}
      >
        תוצאות ספורט ע&quot;י{" "}
        <a
          href="https://www.365scores.com/he"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0284c7", textDecoration: "none" }}
        >
          365Scores
        </a>
      </div>

      {/* ── Widget modal root (required for match-detail overlays) ────── */}
      <div id="modal-root" className="scores365" />
    </div>
  );
}
