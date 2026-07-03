import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type Transaction } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

const TX_TYPES = ["", "mining", "referral", "task", "quest", "achievement", "admin_grant", "admin_deduct"];

function typeColor(type: string) {
  const map: Record<string, string> = {
    mining: "text-yellow-400",
    referral: "text-blue-400",
    task: "text-emerald-400",
    quest: "text-purple-400",
    achievement: "text-primary",
    admin_grant: "text-green-400",
    admin_deduct: "text-red-400",
  };
  return map[type] ?? "text-muted-foreground";
}

const LIMIT = 50;

export function Transactions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (o: number, replace = true) => {
      setLoading(true);
      try {
        const res = await adminApi.getTransactions({ search, type, dateFrom, dateTo, limit: LIMIT, offset: o });
        if (replace) {
          setTransactions(res.transactions);
        } else {
          setTransactions((prev) => [...prev, ...res.transactions]);
        }
        setTotal(res.total);
        setOffset(o);
      } catch (e: unknown) {
        toast({ title: (e as Error).message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [search, type, dateFrom, dateTo, toast],
  );

  useEffect(() => {
    const t = setTimeout(() => load(0), 350);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 pt-4 pb-2 shrink-0 flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Telegram ID…"
            className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {TX_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                type === t ? "bg-primary text-black" : "bg-border/20 text-muted-foreground hover:text-white"
              }`}
            >
              {t || "All"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 bg-card border border-border/50 rounded-xl px-3 py-2 text-white text-xs outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 bg-card border border-border/50 rounded-xl px-3 py-2 text-white text-xs outline-none"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${total.toLocaleString()} transactions`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1.5">
        {loading && transactions.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : (
          <>
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/30 bg-card/40">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tx.telegramId} · <span className={typeColor(tx.type)}>{tx.type}</span> · {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.amount >= 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
            {transactions.length < total && (
              <button
                onClick={() => load(offset + LIMIT, false)}
                disabled={loading}
                className="py-3 text-sm text-muted-foreground hover:text-white border border-border/30 rounded-xl"
              >
                {loading ? "Loading…" : `Load more (${total - transactions.length} remaining)`}
              </button>
            )}
            {!loading && transactions.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No transactions found</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
