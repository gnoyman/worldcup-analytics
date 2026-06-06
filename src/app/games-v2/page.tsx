"use client";

import { Suspense } from "react";
import { AppProvider } from "@/components/AppContext";
import { GamesV2Page } from "@/components/pages/GamesV2Page";

export default function GamesV2Route() {
  return (
    <AppProvider>
      <Suspense
        fallback={
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100vh",
            background: "linear-gradient(160deg,#060e2a 0%,#0a1628 50%,#06101f 100%)",
            color: "rgba(255,255,255,.5)",
            fontSize: "14px", fontWeight: 700,
          }}>
            טוען…
          </div>
        }
      >
        <GamesV2Page />
      </Suspense>
    </AppProvider>
  );
}
