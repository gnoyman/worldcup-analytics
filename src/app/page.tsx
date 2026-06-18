"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppProvider } from "@/components/AppContext";
import { WorldCupHeroHeader } from "@/components/WorldCupHeroHeader";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { GamesPageV2 } from "@/components/pages/GamesPageV2";
import { GroupsPage } from "@/components/pages/GroupsPage";
import { BracketPage } from "@/components/pages/BracketPage";
import { TeamPage } from "@/components/pages/TeamPage";
import { StatsPage } from "@/components/pages/StatsPage";
import { DiagnosticsPage } from "@/components/pages/DiagnosticsPage";
import { Scores365Page } from "@/components/pages/Scores365Page";

const VALID_TABS = new Set<Tab>([
  "live", "scores365", "groups", "bracket", "team", "statistics", "debug",
]);

function AppContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab") as Tab | null;
  const tab: Tab = raw && VALID_TABS.has(raw) ? raw : "live";

  const renderPage = () => {
    switch (tab) {
      case "live":       return <GamesPageV2 />;
      case "scores365":  return <Scores365Page />;
      case "groups":     return <GroupsPage />;
      case "bracket":    return <BracketPage />;
      case "team":       return <TeamPage />;
      case "statistics": return <StatsPage />;
      case "debug":      return <DiagnosticsPage />;
    }
  };

  return (
    <>
      <WorldCupHeroHeader />
      {renderPage()}
      <BottomNav currentTab={tab} />
    </>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-white">
            טוען...
          </div>
        }
      >
        <AppContent />
      </Suspense>
    </AppProvider>
  );
}
