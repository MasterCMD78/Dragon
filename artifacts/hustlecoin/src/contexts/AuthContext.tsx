import React, { createContext, useContext, useEffect, useState } from "react";
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isTelegramAvailable: true,
});

export const useAuth = () => useContext(AuthContext);

const DEV_BYPASS = import.meta.env.VITE_ALLOW_DEV_BYPASS === "true";
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID || "999888777";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(true);
  const queryClient = useQueryClient();
  const { data: user, isLoading: isMeLoading } = useGetMe();
  const authMutation = useTelegramAuth();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (webApp && webApp.initData) {
      webApp.ready();
      webApp.expand();

      if (!user && !isMeLoading) {
        authMutation.mutate(
          { data: { initData: webApp.initData } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            },
          },
        );
      }
      return;
    }

    if (DEV_BYPASS) {
      if (!user && !isMeLoading) {
        authMutation.mutate(
          { data: { initData: `dev_bypass:${DEV_USER_ID}` } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
            },
          },
        );
      }
      return;
    }

    setIsTelegramAvailable(false);
  }, [user, isMeLoading, queryClient]);

  const isLoading = isMeLoading || authMutation.isPending;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isAuthenticated, isTelegramAvailable }}>
      {children}
    </AuthContext.Provider>
  );
};
