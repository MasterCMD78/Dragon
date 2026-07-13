import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Link } from "wouter";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 30;

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const offset = (page - 1) * limit;
        const query = new URLSearchParams({ search, filter, limit: limit.toString(), offset: offset.toString() });
        const res = await apiFetch<{ users: any[], total: number }>(`/api/admin/users?${query}`);
        setUsers(res.users);
        setTotal(res.total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    // debounce search
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [search, filter, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold">Users</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search ID, username..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "active_today", "admin", "banned"].map(f => (
          <button 
            key={f} 
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${filter === f ? 'bg-primary text-black font-bold' : 'bg-[#0a0a0a] text-muted-foreground hover:text-white border border-white/5'}`}
          >
            {f.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Telegram ID</th>
                <th className="px-6 py-4 font-medium">Username</th>
                <th className="px-6 py-4 font-medium">HP Balance</th>
                <th className="px-6 py-4 font-medium">Level</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No users found.</td></tr>
              ) : (
                users.map(u => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-mono text-xs">{u.telegramId}</td>
                    <td className="px-6 py-4">{u.username ? `@${u.username}` : u.firstName}</td>
                    <td className="px-6 py-4 text-primary font-bold">{u.balance.toLocaleString()}</td>
                    <td className="px-6 py-4">{u.level}</td>
                    <td className="px-6 py-4">
                      {u.isBanned ? (
                        <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs">Banned</span>
                      ) : u.isAdmin ? (
                        <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs">Admin</span>
                      ) : (
                        <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/users/${u.telegramId}`} className="inline-flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {total > limit && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Showing {(page-1)*limit + 1} to {Math.min(page*limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="p-2 bg-white/5 rounded disabled:opacity-50 hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page * limit >= total} onClick={() => setPage(p => p+1)} className="p-2 bg-white/5 rounded disabled:opacity-50 hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
