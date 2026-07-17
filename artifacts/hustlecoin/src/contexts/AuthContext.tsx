import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import {
  useTelegramAuth,
  useGetMe,
  getGetMeQueryKey,
  getGetMiningStatusQueryKey,
  getGetUserProfileQueryKey,
  type User,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTelegramAvailable: boolean;
  isBanned: boolean;
  /** True once we've given up retrying and auth could not complete. */
  authFailed: boolean;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isTelegramAvailable: true,
  isBanned: false,
  authFailed: false,
  retryAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const DEV_BYPASS = import.meta.env.VITE_ALLOW_DEV_BYPASS === "true";
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID || "999888777";

// Telegram's own WebApp SDK script (loaded in index.html) ALWAYS creates
// `window.Telegram.WebApp`, whether or not the page was actually opened from
// inside Telegram — see telegram.org/js/telegram-web-app.js, which
// unconditionally runs `window.Telegram = {}` and `var WebApp = {}` on load.
// `initData` defaults to an empty string and is only populated when Telegram
// passes launch params via the URL hash. So `webApp` truthiness can NEVER be
// used to detect "running inside Telegram" — only `initData` can.
const INIT_DATA_RETRY_ATTEMPTS = 5;
const INIT_DATA_RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAccountBanned(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  if (e["status"] !== 403) return false;
  const data = e["data"];
  if (!data || typeof data !== "object") return false;
  return (data as Record<string, unknown>)["error"] === "ACCOUNT_BANNED";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // "checking"      — still probing for Telegram launch data (with retries)
  // "no-telegram"   — telegram-web-app.js never loaded at all (script blocked/offline)
  // "authenticating"— a login request is in flight
  // "authenticated" — login succeeded (derived from `user` being set)
  // "failed"        — initData never became available / login kept failing after retries
  const [phase, setPhase] = useState<"checking" | "no-telegram" | "authenticating" | "failed">(
    "checking",
  );
  const [isBanned, setIsBanned] = useState(false);
  const startedRef = useRef(false);
  const queryClient = useQueryClient();
  const { data: user, isLoading: isMeLoading } = useGetMe();
  const authMutation = useTelegramAuth();

  // Listen for global ban events dispatched by QueryCache/MutationCache in App.tsx
  useEffect(() => {
    const handler = () => setIsBanned(true);
    window.addEventListener("account-banned", handler);
    return () => window.removeEventListener("account-banned", handler);
  }, []);

  // Also watch authMutation error directly in case event fired before listener mounted
  useEffect(() => {
    if (authMutation.isError && isAccountBanned(authMutation.error)) {
      setIsBanned(true);
    }
  }, [authMutation.isError, authMutation.error]);

  const runAuth = useCallback(async () => {
    setIsBanned(false);
    setPhase("checking");

    // ── Startup diagnostics ────────────────────────────────────────────────
    // Logged on every auth attempt so you can compare "Browser (dev bypass)"
    // vs "Telegram WebView" side-by-side in the console / DevTools.
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const webAppRaw = window.Telegram?.WebApp;
    /* eslint-disable no-console */
    console.group("[HustleCoin] 🔍 Startup diagnostics");
    console.log("window.location.href       :", window.location.href);
    console.log("search params              :", Object.fromEntries(searchParams.entries()));
    console.log("hash params (tgWebApp*)    :", Object.fromEntries(hashParams.entries()));
    console.log("tgWebAppData (hash)        :", hashParams.get("tgWebAppData") ?? "(none)");
    console.log("tgWebAppStartParam (hash)  :", hashParams.get("tgWebAppStartParam") ?? "(none)");
    console.log("Telegram SDK loaded        :", !!window.Telegram);
    console.log("Telegram.WebApp exists     :", !!webAppRaw);
    console.log("Telegram.WebApp.platform   :", webAppRaw?.platform ?? "(none)");
    console.log("Telegram.WebApp.version    :", webAppRaw?.version ?? "(none)");
    console.log("Telegram.WebApp.initData   :", webAppRaw?.initData ? `${webAppRaw.initData.slice(0, 60)}…` : "(empty)");
    console.log("Telegram.WebApp.initDataUnsafe:", JSON.stringify(webAppRaw?.initDataUnsafe ?? "(none)"));
    console.log("DEV_BYPASS active          :", DEV_BYPASS);
    console.groupEnd();
    /* eslint-enable no-console */

    // Capture the WebApp reference immediately so we can call ready() without
    // waiting for initData.  ready() MUST be called as early as possible —
    // Telegram holds its own loading overlay until it receives this signal.
    // If we delay ready() until after the initData retry loop (≤ 2 s), some
    // Telegram clients time out and close or reset the Mini App, producing a
    // blank / broken startup state that does not occur when opening from a
    // regular browser (where there is no Telegram overlay to time out).
    const webApp = webAppRaw;
    webApp?.ready();

    // Give the SDK a chance to populate `initData`.  It is synchronous in
    // normal Telegram launches (the script reads the URL hash before our JS
    // runs), but we retry briefly for clients that deliver it asynchronously.
    let initData = webApp?.initData ?? "";
    for (let attempt = 0; !initData && attempt < INIT_DATA_RETRY_ATTEMPTS; attempt++) {
      await sleep(INIT_DATA_RETRY_DELAY_MS);
      initData = webApp?.initData ?? "";
      if (initData) {
        // eslint-disable-next-line no-console
        console.log(`[HustleCoin] initData arrived on retry attempt ${attempt + 1}`);
      }
    }

    if (initData) {
      // Expand to full screen only once we know we are inside Telegram.
      // expand() is safe to call after ready(); it resizes the WebView to the
      // maximum available height so the app fills the screen.
      webApp?.expand();
      setPhase("authenticating");
      // Also extract start_param from initDataUnsafe as an explicit referralCode.
      // This is belt-and-suspenders: the backend already parses start_param from
      // the validated initData, but sending it here ensures it's captured even
      // if the link format or Telegram version differs.
      const startParam: string | null =
        (webApp?.initDataUnsafe as { start_param?: string } | undefined)?.start_param ?? null;
      /* eslint-disable no-console */
      console.group("[HustleCoin] 🔐 Telegram auth → POST /api/auth/telegram");
      console.log("initData length :", initData.length);
      console.log("initData prefix :", initData.slice(0, 60) + "…");
      console.log("start_param     :", startParam);
      console.log("platform        :", webApp?.platform ?? "(none)");
      console.log("version         :", webApp?.version ?? "(none)");
      console.groupEnd();
      /* eslint-enable no-console */
      authMutation.mutate(
        { data: { initData, referralCode: startParam } },
        {
          onSuccess: (data) => {
            // eslint-disable-next-line no-console
            console.log("[HustleCoin] ✅ Auth success → user:", data.user?.id, data.user?.firstName);
            // Populate the user cache directly from the POST /api/auth/telegram
            // response body. This is the single source of truth for the initial
            // authenticated user object.
            //
            // ⚠️  DO NOT call invalidateQueries({ queryKey: getGetMeQueryKey() })
            // here. In Telegram's iOS WKWebView the Set-Cookie header from the
            // auth POST response is written to the WKHTTPCookieStore
            // asynchronously. If we trigger a GET /api/auth/me refetch
            // immediately (which invalidateQueries does when there is an active
            // useGetMe() subscriber), the request flies out before the session
            // cookie lands in the store → 401 → stale query data is cleared →
            // the user appears logged out and all subsequent authenticated API
            // calls (mining, referrals, wallet) fail with 401 as well.
            //
            // setQueryData alone is sufficient: the user object is fresh from
            // the server, isAuthenticated becomes true immediately, and the
            // 30-second staleTime means the next background refetch only fires
            // well after the cookie is safely persisted.
            queryClient.setQueryData(getGetMeQueryKey(), data.user);
            // Invalidate dependent queries so pages get fresh data after login.
            // Mining status and user profile do NOT depend on the session cookie
            // being present before the invalidation fires — they simply refetch
            // and will 401 gracefully if the cookie is not yet stored, then
            // succeed on the next stale refetch (30 s later).
            queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            // Also invalidate the user profile query — Profile page reads from
            // GET /api/users/me (a separate endpoint with its own cache key).
            // Without this, any cached 401 error on that key is never cleared
            // after login and the profile name stays blank.
            queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          },
          onError: (err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("[HustleCoin] ❌ Auth FAILED (real initData path)", err);
            if (isAccountBanned(err)) {
              setIsBanned(true);
            } else {
              setPhase("failed");
            }
          },
        },
      );
      return;
    }

    // No real initData ever showed up. In dev, fall back to the bypass user
    // so local/browser testing keeps working exactly as before.
    if (DEV_BYPASS) {
      setPhase("authenticating");
      authMutation.mutate(
        { data: { initData: `dev_bypass:${DEV_USER_ID}` } },
        {
          onSuccess: (data) => {
            // Same reasoning as the real initData path above:
            // do NOT invalidate getGetMeQueryKey after setQueryData.
            queryClient.setQueryData(getGetMeQueryKey(), data.user);
            queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          },
          onError: (err: unknown) => {
            if (isAccountBanned(err)) {
              setIsBanned(true);
            } else {
              setPhase("failed");
            }
          },
        },
      );
      return;
    }

    // Not in dev, no Telegram launch data ever arrived. Distinguish "SDK
    // script never loaded at all" (truly opened outside Telegram, e.g. a
    // direct browser hit with no Telegram context whatsoever) from "SDK
    // loaded but never received initData" (still show a retry-able error,
    // since this can be a transient Telegram-side issue on refresh).
    setPhase(webApp ? "failed" : "no-telegram");
  }, [authMutation, queryClient]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryAuth = useCallback(async () => {
    setIsBanned(false);
    authMutation.reset();
    await queryClient.resetQueries({ queryKey: getGetMeQueryKey() });
    await runAuth();
  }, [queryClient, authMutation, runAuth]);

  const isAuthenticated = !!user;
  const isTelegramAvailable = phase !== "no-telegram";
  const authFailed = phase === "failed" && !isAuthenticated;
  const isLoading =
    !isAuthenticated &&
    !authFailed &&
    phase !== "no-telegram" &&
    (phase === "checking" || phase === "authenticating" || isMeLoading || authMutation.isPending);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated,
        isTelegramAvailable,
        isBanned,
        authFailed,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
