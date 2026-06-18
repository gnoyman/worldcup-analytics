"use client";

import Link from "next/link";

export type Tab =
  | "live"
  | "scores365"
  | "groups"
  | "bracket"
  | "team"
  | "statistics"
  | "debug";

interface BottomNavProps {
  currentTab: Tab;
}

const NAV_TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "live",       label: "משחקים",      icon: "📅" },
  { id: "scores365",  label: "לייב",        icon: "🔴" },
  { id: "groups",     label: "בתים",        icon: "🏆" },
  { id: "bracket",    label: "הצלבות",      icon: "🎯" },
  { id: "team",       label: "נבחרת",       icon: "⚽" },
  { id: "statistics", label: "סטטיסטיקות",  icon: "🏅" },
  { id: "debug",      label: "דיאגנוסטיקה", icon: "🔧" },
];

export function BottomNav({ currentTab }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "linear-gradient(to top, #040b1e 0%, #060e2a 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -4px 24px rgba(0,0,0,.5)",
      }}
    >
      <div className="flex items-stretch h-[62px]">
        {NAV_TABS.map((tab) => {
          const active = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/?tab=${tab.id}`}
              className="flex flex-col items-center justify-center flex-1 min-w-0 relative transition-all duration-150"
              style={{ color: active ? "#f59e0b" : "rgba(255,255,255,0.38)" }}
            >
              {/* Gold shimmer indicator at top */}
              {active && (
                <span
                  className="absolute top-0 left-2 right-2 h-[2px] rounded-b-full"
                  style={{
                    background: "linear-gradient(to right, transparent, #f59e0b, #f97316, transparent)",
                    boxShadow: "0 0 8px rgba(245,158,11,.6)",
                  }}
                />
              )}

              <span
                className="text-xl leading-none mb-[2px]"
                style={{
                  filter: active
                    ? "drop-shadow(0 0 6px rgba(245,158,11,.55))"
                    : undefined,
                }}
              >
                {tab.icon}
              </span>

              <span
                className="leading-none"
                style={{
                  fontSize: "8px",
                  fontWeight: active ? 800 : 600,
                  letterSpacing: "0.01em",
                  color: active ? "#fbbf24" : "rgba(255,255,255,0.35)",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
