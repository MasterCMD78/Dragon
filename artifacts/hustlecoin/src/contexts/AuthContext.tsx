import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  useTelegramAuth,
  useGetMe,
  getGetMeQueryKey,
  getGetMiningStatusQueryKey,
  type User,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTelegramAvailable: boolean;
  isBanned: boolean;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isTelegramAvailable: true,
  isBanned: false,
  retryAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const DEV_BYPASS = import.meta.env.VITE_ALLOW_DEV_BYPASS === "true";
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID || "999888777";

export function isAccountBanned(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;
  if (e["status"] !== 403) return false;
  const data = e["data"];
  if (!data || typeof data !== "object") return false;
  return (data as Record<string, unknown>)["error"] === "ACCOUNT_BANNED";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
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

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (webApp?.initData) {
      webApp.ready();
      webApp.expand();

      if (!user && !isMeLoading) {
        authMutation.mutate(
          { data: { initData: webApp.initData } },
          {
            onSuccess: () => {
              setIsBanned(false);
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            },
            onError: (err) => {
              if (isAccountBanned(err)) setIsBanned(true);
            },
          },
        );
      }
      return;
    }

    if (DEV_BYPASS && !webApp) {
      if (!user && !isMeLoading) {
        authMutation.mutate(
          { data: { initData: `dev_bypass:${DEV_USER_ID}` } },
          {
            onSuccess: () => {
              setIsBanned(false);
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            },
            onError: (err) => {
              if (isAccountBanned(err)) setIsBanned(true);
            },
          },
        );
      }
      return;
    }

    if (!webApp) {
      setIsTelegramAvailable(false);
    }
  }, [user, isMeLoading, queryClient]);

  const retryAuth = useCallback(async () => {
    setIsBanned(false);
    authMutation.reset();
    await queryClient.resetQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient, authMutation]);

  const isLoading = isMeLoading || authMutation.isPending;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user: user || null, isLoading, isAuthenticated, isTelegramAvailable, isBanned, retryAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};
