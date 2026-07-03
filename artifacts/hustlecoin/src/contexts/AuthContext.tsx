import React, { createContext, useContext, useEffect, useState } from "react";
import { useTelegramAuth, useGetMe, getGetMeQueryKey, type User } from "@workspace/api-client-react";
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTelegramAvailable, setIsTelegramAvailable] = useState(true);
  const queryClient = useQueryClient();
  const { data: user, isLoading: isMeLoading } = useGetMe();
  const authMutation = useTelegramAuth();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    
    if (!webApp || !webApp.initData) {
      setIsTelegramAvailable(false);
      return;
    }

    webApp.ready();
    webApp.expand();

    if (!user && !isMeLoading) {
      authMutation.mutate({ data: { initData: webApp.initData } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }
      });
    }
  }, [user, isMeLoading, queryClient]);

  const isLoading = isMeLoading || authMutation.isPending;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isAuthenticated, isTelegramAvailable }}>
      {children}
    </AuthContext.Provider>
  );
};
