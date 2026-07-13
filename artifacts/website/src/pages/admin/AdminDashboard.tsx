import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Users, Zap, Target, Star, Activity, Link as LinkIcon, RefreshCw, BarChart } from "lucide-react";
import { Link } from "wouter";

interface Stats {
  totalUsers: number;
  activeToday: number;
  minesToday: number;
  totalHPInCirculation: number;
  totalReferrals: number;
  pendingTaskApprovals: number;
  totalAchievementsUnlocked: number;
  notificationsSentToday: number;
}

interface Log {
  id: number;
  adminTelegramId: string;
  action: string;
  targetTelegramId: string | null;
  details: any;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<{ logs: Log[] }>("/api/admin/logs?limit=10")
    ])
      .then(([s, l]) => {
        setStats(s);
        setLogs(l.logs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading dashboard...</div>;
  }

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-400" },
    { title: "Active Today", value: stats?.activeToday || 0, icon: Activity, color: "text-green-400" },
    { title: "HP Circulating", value: stats?.totalHPInCirculation || 0, icon: Zap, color: "text-yellow-400" },
    { title: "Mines Today", value: stats?.minesToday || 0, icon: Target, color: "text-purple-400" },
    { title: "Total Referrals", value: stats?.totalReferrals || 0, icon: LinkIcon, color: "text-pink-400" },
    { title: "Tasks Pending", value: stats?.pendingTaskApprovals || 0, icon: RefreshCw, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((s, i) => (
          <motion.div 
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 relative overflow-hidden group"
          >
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div className="text-sm text-muted-foreground mb-1">{s.title}</div>
            <div className="text-3xl font-heading font-bold">{s.value.toLocaleString()}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-heading font-bold">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { to: "/admin/users", label: "Manage Users", icon: Users },
              { to: "/admin/blog", label: "Write Post", icon: Star },
              { to: "/admin/announcements", label: "Announcements", icon: Activity },
              { to: "/admin/analytics", label: "View Analytics", icon: BarChart },
            ].map(link => (
              <Link key={link.to} href={link.to} className="bg-[#0a0a0a] border border-white/5 hover:border-primary/50 p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors text-center">
                <link.icon className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-heading font-bold mb-6">Recent Activity</h2>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No recent activity</div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-primary">{log.action}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      Admin {log.adminTelegramId} {log.targetTelegramId ? `→ Target ${log.targetTelegramId}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
