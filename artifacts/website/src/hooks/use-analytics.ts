import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    // Generate or get sessionId
    let sessionId = localStorage.getItem("hustlecoin_session_id");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("hustlecoin_session_id", sessionId);
    }

    // Fire and forget
    fetch("/api/public/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location, sessionId })
    }).catch(() => {});
  }, [location]);
}
