import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "./AdminLayout";
import { Dashboard } from "./Dashboard";
import { Users } from "./Users";
import { UserDetail } from "./UserDetail";
import { Tasks } from "./Tasks";
import { Quests } from "./Quests";
import { Achievements } from "./Achievements";
import { Broadcast } from "./Broadcast";
import { Announcements } from "./Announcements";
import { Transactions } from "./Transactions";
import { Logs } from "./Logs";
import { ShieldOff, Loader2, RefreshCw } from "lucide-react";

function AccessDenied() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50 gap-4">
        <ShieldOff className="w-16 h-16 text-destructive/60" />
        <div>
          <h1 className="text-xl font-display font-bold text-white mb-1">Access Denied</h1>
          <p className="text-muted-foreground text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [location] = useLocation();
  const { isLoading, isAuthenticated, authFailed, retryAuth, user } = useAuth();

  // Mirror Layout.tsx's terminal auth-error state here too, since /admin is
  // rendered outside <Layout>. Never leave admins staring at an infinite
  // spinner or a misleading "Access Denied" when auth simply failed/retried.
  if (authFailed) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50 gap-4">
          <ShieldOff className="w-16 h-16 text-destructive/60" />
          <div>
            <h1 className="text-xl font-display font-bold text-white mb-1">Connection Failed</h1>
            <p className="text-muted-foreground text-sm">We couldn't verify your session. Try again.</p>
          </div>
          <button
            onClick={() => void retryAuth()}
            className="flex items-center justify-center gap-2 rounded-xl py-3 px-6 bg-primary text-black font-display font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex items-center justify-center border-x border-border/50">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return <AccessDenied />;
  }

  // Route matching
  const userDetailMatch = location.match(/^\/admin\/users\/(.+)$/);

  let content: React.ReactNode;
  if (userDetailMatch) {
    content = <UserDetail telegramId={userDetailMatch[1]!} />;
  } else if (location === "/admin/users") {
    content = <Users />;
  } else if (location === "/admin/tasks") {
    content = <Tasks />;
  } else if (location === "/admin/quests") {
    content = <Quests />;
  } else if (location === "/admin/achievements") {
    content = <Achievements />;
  } else if (location === "/admin/broadcast") {
    content = <Broadcast />;
  } else if (location === "/admin/announcements") {
    content = <Announcements />;
  } else if (location === "/admin/transactions") {
    content = <Transactions />;
  } else if (location === "/admin/logs") {
    content = <Logs />;
  } else {
    content = <Dashboard />;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
