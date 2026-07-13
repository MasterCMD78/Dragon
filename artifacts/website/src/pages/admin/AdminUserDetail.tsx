import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Ban, CheckCircle, ShieldAlert, Zap, Edit3 } from "lucide-react";

export default function AdminUserDetail() {
  const { telegramId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await apiFetch(`/api/admin/users/${telegramId}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [telegramId]);

  const handleBanToggle = async () => {
    if (!confirm(`Are you sure you want to ${data.user.isBanned ? 'unban' : 'ban'} this user?`)) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/users/${telegramId}/${data.user.isBanned ? 'unban' : 'ban'}`, { method: "POST" });
      await fetchUser();
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditHP = async () => {
    const amount = prompt("Enter amount to add/subtract (e.g. 1000 or -500):");
    if (!amount || isNaN(Number(amount))) return;
    const reason = prompt("Reason for adjustment (optional):");
    
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/users/${telegramId}/hp`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason })
      });
      await fetchUser();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading user...</div>;
  if (!data) return <div className="text-center py-20 text-red-500">User not found</div>;

  const { user, stats, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            {user.firstName} {user.lastName} 
            {user.isAdmin && <ShieldAlert className="w-5 h-5 text-primary" />}
          </h1>
          <p className="text-muted-foreground font-mono mt-1">ID: {user.telegramId} {user.username && `| @${user.username}`}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleEditHP} disabled={actionLoading} className="px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Adjust HP
          </button>
          <button onClick={handleBanToggle} disabled={actionLoading} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${user.isBanned ? 'bg-green-500 text-black hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}>
            {user.isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            {user.isBanned ? "Unban User" : "Ban User"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <div className="text-sm text-muted-foreground mb-1">Balance</div>
          <div className="text-3xl font-heading font-bold text-primary">{user.balance.toLocaleString()} HP</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <div className="text-sm text-muted-foreground mb-1">Current Level</div>
          <div className="text-3xl font-heading font-bold">{user.level}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <div className="text-sm text-muted-foreground mb-1">Current Streak</div>
          <div className="text-3xl font-heading font-bold text-orange-400">{user.streak} Days</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Mines</div>
          <div className="text-3xl font-heading font-bold">{user.totalMines.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold mb-4">Stats</h2>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-muted-foreground">Joined</span><span>{new Date(user.joinDate).toLocaleDateString()}</span></div>
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-muted-foreground">Tasks Completed</span><span>{stats?.tasksCompleted || 0}</span></div>
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-muted-foreground">Quests Completed</span><span>{stats?.questsCompleted || 0}</span></div>
            <div className="flex justify-between py-2 border-b border-white/5"><span className="text-muted-foreground">Referrals</span><span>{stats?.totalReferrals || 0}</span></div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold mb-4">Recent Transactions</h2>
          {recentTransactions?.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">No recent transactions</div>
          ) : (
            <div className="space-y-3">
              {recentTransactions?.map((tx: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{tx.description || tx.type}</div>
                    <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
