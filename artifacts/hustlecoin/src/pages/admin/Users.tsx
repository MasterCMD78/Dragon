import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { adminApi, type AdminUser } from "@/lib/adminApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight, Shield, Ban, Crown } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active_today", label: "Active Today" },
  { key: "joined_today", label: "New Today" },
  { key: "joined_week", label: "This Week" },
  { key: "banned", label: "Banned" },
  { key: "admin", label: "Admins" },
  { key: "high_miners", label: "High Miners" },
  { key: "referred", label: "Referred" },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Users() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const LIMIT = 30;

  const load = useCallback(
    async (s: string, f: string, o: number, replace = true) => {
      setLoading(true);
      try {
        const res = await adminApi.getUsers({ search: s, filter: f, limit: LIMIT, offset: o });
        if (replace) {
          setUsers(res.users);
        } else {
          setUsers((prev) => [...prev, ...res.users]);
        }
        setTotal(res.total);
        setOffset(o);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => load(search, filter, 0), 300);
    return () => clearTimeout(t);
  }, [search, filter, load]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, username, name…"
            className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>
        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-2 pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-primary text-black"
                  : "bg-border/20 text-muted-foreground hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {loading ? "Loading…" : `${total.toLocaleString()} users`}
        </p>
      </div>

      {error && (
        <div className="mx-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-2">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && users.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <button
                key={u.telegramId}
                onClick={() => navigate(`/admin/users/${u.telegramId}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-border/70 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {(u.firstName || u.telegramId).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white truncate">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.telegramId}
                    </span>
                    {u.isAdmin && <Crown className="w-3 h-3 text-primary shrink-0" />}
                    {u.isBanned && <Ban className="w-3 h-3 text-destructive shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {/* "user" is a legacy placeholder — show telegramId instead */}
                    {u.username && u.username !== "user" ? `@${u.username}` : u.telegramId}
                    {" · "}{u.balance.toLocaleString()} HP
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Active {relTime(u.lastActive)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}

            {/* Load more */}
            {users.length < total && (
              <button
                onClick={() => load(search, filter, offset + LIMIT, false)}
                disabled={loading}
                className="w-full py-3 text-sm text-muted-foreground hover:text-white border border-border/30 rounded-xl transition-colors"
              >
                {loading ? "Loading…" : `Load more (${total - users.length} remaining)`}
              </button>
            )}
            {!loading && users.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No users found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
