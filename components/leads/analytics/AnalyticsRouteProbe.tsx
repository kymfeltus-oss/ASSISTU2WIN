"use client";

import { useEffect } from "react";

/** Debug-only: confirms leads analytics route mounted past layout gates. */
export function AnalyticsRouteProbe() {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7764/ingest/a95af5bd-0217-4f46-848b-1173c2c72d98", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3fd78e" },
      body: JSON.stringify({
        sessionId: "3fd78e",
        hypothesisId: "B",
        location: "AnalyticsRouteProbe.tsx:mount",
        message: "leads_analytics_page_mounted",
        data: {
          windowPath:
            typeof window !== "undefined" ? window.location.pathname : "ssr",
          href: typeof window !== "undefined" ? window.location.href : "ssr",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  return null;
}
