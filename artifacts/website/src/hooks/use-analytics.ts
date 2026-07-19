import { useEffect } from "react";
import { useLocation } from "wouter";

export function useAnalytics() {
  const [location] = useLocation();

  useEffect(() => {
    // Persistent visitor ID (survives across sessions, used for new vs returning)
    let visitorId = localStorage.getItem("hustlecoin_visitor_id");
    if (!visitorId) {
      visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36) + "v";
      localStorage.setItem("hustlecoin_visitor_id", visitorId);
    }

    // Per-session ID (reset when tab/browser is closed)
    let sessionId = sessionStorage.getItem("hustlecoin_session_id");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("hustlecoin_session_id", sessionId);
    }

    // Fire and forget
    fetch("/api/public/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location, sessionId, visitorId })
    }).catch(() => {});
  }, [location]);
}
