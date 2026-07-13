import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api";

interface User {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  isAdmin: boolean;
}

interface AdminAuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (telegramId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: User }>("/api/admin/website-auth/me")
      .then((res) => {
        if (res.user?.isAdmin) {
          setUser(res.user);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (telegramId: string, password: string) => {
    const res = await apiFetch<{ success: boolean; user: User }>("/api/admin/website-auth/login", {
      method: "POST",
      body: JSON.stringify({ telegramId, password }),
    });
    if (res.success && res.user.isAdmin) {
      setUser(res.user);
    } else {
      throw new Error("Not authorized");
    }
  };

  const logout = async () => {
    await apiFetch("/api/admin/website-auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
