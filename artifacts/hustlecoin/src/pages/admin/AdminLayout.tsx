import React from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Swords,
  Award,
  Bell,
  Megaphone,
  ArrowRightLeft,
  ScrollText,
  ChevronLeft,
  ShieldCheck,
  Settings2,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { path: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { path: "/admin/users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { path: "/admin/tasks", label: "Tasks", icon: <ListChecks className="w-4 h-4" /> },
  { path: "/admin/quests", label: "Quests", icon: <Swords className="w-4 h-4" /> },
  { path: "/admin/achievements", label: "Achievements", icon: <Award className="w-4 h-4" /> },
  { path: "/admin/broadcast", label: "Broadcast", icon: <Bell className="w-4 h-4" /> },
  { path: "/admin/announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
  { path: "/admin/transactions", label: "Transactions", icon: <ArrowRightLeft className="w-4 h-4" /> },
  { path: "/admin/logs", label: "Audit Logs", icon: <ScrollText className="w-4 h-4" /> },
  { path: "/admin/settings", label: "Settings", icon: <Settings2 className="w-4 h-4" /> },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col relative border-x border-border/50 overflow-hidden">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/60">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <span className="text-white font-display font-bold text-lg leading-none">
            Admin Panel
          </span>
        </div>

        {/* Nav tabs */}
        <div className="shrink-0 px-3 py-2 border-b border-border/30">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {NAV.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive(item.path)
                    ? "bg-primary text-black"
                    : "bg-border/20 text-muted-foreground hover:text-white hover:bg-border/30"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
}
