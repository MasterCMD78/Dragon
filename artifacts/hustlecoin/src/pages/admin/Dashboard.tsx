import React, { useEffect, useState } from "react";
import { adminApi, type AdminStats } from "@/lib/adminApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Zap,
  Pickaxe,
  Coins,
  HandshakeIcon,
  Clock,
  Award,
  Bell,
} from "lucide-react";

interface StatCard {
  label: string;
  key: keyof AdminStats;
  icon: React.ReactNode;
  color: string;
  format?: (v: number) => string;
}

const CARDS: StatCard[] = [
  { label: "Total Users", key: "totalUsers", icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
  { label: "Active Today", key: "activeToday", icon: <Zap className="w-5 h-5" />, color: "text-emerald-400" },
  { label: "Mines Today", key: "minesToday", icon: <Pickaxe className="w-5 h-5" />, color: "text-yellow-400" },
  {
    label: "Total HP in Circulation",
    key: "totalHPInCirculation",
    icon: <Coins className="w-5 h-5" />,
    color: "text-primary",
    format: (v) => v.toLocaleString(),
  },
  { label: "Total Referrals", key: "totalReferrals", icon: <HandshakeIcon className="w-5 h-5" />, color: "text-purple-400" },
  { label: "Pending Approvals", key: "pendingTaskApprovals", icon: <Clock className="w-5 h-5" />, color: "text-orange-400" },
  { label: "Achievements Unlocked", key: "totalAchievementsUnlocked", icon: <Award className="w-5 h-5" />, color: "text-pink-400" },
  { label: "Notifications Today", key: "notificationsSentToday", icon: <Bell className="w-5 h-5" />, color: "text-slate-300" },
];

export function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-display font-bold text-white mb-4">Overview</h2>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-border/40 bg-card/60 p-4 flex flex-col gap-2"
          >
            <div className={`${card.color}`}>{card.icon}</div>
            {loading ? (
              <>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <p className="text-2xl font-display font-bold text-white leading-none">
                  {stats
                    ? (card.format
                        ? card.format(stats[card.key])
                        : stats[card.key].toLocaleString())
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
