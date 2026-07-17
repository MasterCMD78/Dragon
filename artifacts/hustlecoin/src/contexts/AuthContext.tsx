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

    // Capture the WebApp reference immediately so we can call ready() without
    // waiting for initData.  ready() MUST be called as early as possible —
    // Telegram holds its own loading overlay until it receives this signal.
    // If we delay ready() until after the initData retry loop (≤ 2 s), some
    // Telegram clients time out and close or reset the Mini App, producing a
    // blank / broken startup state that does not occur when opening from a
    // regular browser (where there is no Telegram overlay to time out).
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();

    // Give the SDK a chance to populate `initData`.  It is synchronous in
    // normal Telegram launches (the script reads the URL hash before our JS
    // runs), but we retry briefly for clients that deliver it asynchronously.
    let initData = webApp?.initData ?? "";
    for (let attempt = 0; !initData && attempt < INIT_DATA_RETRY_ATTEMPTS; attempt++) {
      await sleep(INIT_DATA_RETRY_DELAY_MS);
      initData = webApp?.initData ?? "";
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
      authMutation.mutate(
        { data: { initData, referralCode: startParam } },
        {
          onSuccess: (data) => {
            // Immediately populate the user cache from the POST response body.
            // In cross-origin deployments (e.g. Railway), the session cookie
            // issued by the API server domain may not be available for the
            // GET /api/auth/me refetch that invalidateQueries triggers — the
            // browser may buffer, partition, or delay cross-domain cookies.
            // setQueryData here ensures the user is recognised as authenticated
            // immediately, without waiting for the refetch to confirm it.
            // TanStack Query preserves this data even if the subsequent refetch
            // returns 401 (stale-while-revalidate semantics in v5).
            queryClient.setQueryData(getGetMeQueryKey(), data.user);
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            // Also invalidate the user profile query — Profile page reads from
            // GET /api/users/me (a separate endpoint with its own cache key).
            // Without this, any cached 401 error on that key is never cleared
            // after login and the profile name stays blank.
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

    // No real initData ever showed up. In dev, fall back to the bypass user
    // so local/browser testing keeps working exactly as before.
    if (DEV_BYPASS) {
      setPhase("authenticating");
      authMutation.mutate(
        { data: { initData: `dev_bypass:${DEV_USER_ID}` } },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getGetMeQueryKey(), data.user);
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
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
