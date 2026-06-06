import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  env: {
    // Expose server-side USE_MOCK_DATA to the browser bundle at build time.
    // Client code reads process.env.NEXT_PUBLIC_USE_MOCK_DATA.
    NEXT_PUBLIC_USE_MOCK_DATA: process.env.USE_MOCK_DATA ?? "true",
    // Expose dev mode flag so client components know WC 2026 data may be unavailable.
    NEXT_PUBLIC_API_FOOTBALL_DEV_MODE: process.env.API_FOOTBALL_DEV_MODE ?? "false",
    // Sync strategy flags — read by AppHeader and diagnostics.
    NEXT_PUBLIC_API_SYNC_MODE: process.env.API_SYNC_MODE ?? "daily",
    NEXT_PUBLIC_API_ALLOW_MANUAL_REFRESH: process.env.API_ALLOW_MANUAL_REFRESH ?? "true",
    // Active football data provider — read by LivePage and diagnostics.
    NEXT_PUBLIC_FOOTBALL_DATA_PROVIDER: process.env.FOOTBALL_DATA_PROVIDER ?? "",
  },
};

export default nextConfig;
