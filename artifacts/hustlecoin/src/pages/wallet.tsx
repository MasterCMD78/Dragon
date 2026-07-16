import React, { useState, useCallback } from "react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { customFetch } from "@workspace/api-client-react";
import {
  Wallet,
  Pickaxe,
  Users,
  ListChecks,
  Swords,
  Award,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ChevronRight,
  X,
  Loader2,
  History,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  relatedId: string | null;
  createdAt: string;
}

interface WalletResponse {
  balance: number;
  transactions: WalletTransaction[];
  total: number;
}

async function fetchWallet(params: {
  filter: string;
  type: string;
  search: string;
  limit: number;
  offset: number;
}): Promise<WalletResponse> {
  const q = new URLSearchParams();
  q.set("filter", params.filter);
  q.set("limit", String(params.limit));
  q.set("offset", String(params.offset));
  if (params.type) q.set("type", params.type);
  if (params.search) q.set("search", params.search);

  // Use the api-client's customFetch so that VITE_API_URL is respected in
  // cross-origin Railway deployments (same as all other pages) and the
  // CSRF token is automatically applied for any future mutating requests.
  return customFetch<WalletResponse>(`/api/wallet/transactions?${q.toString()}`);
}

// ─── Type metadata ────────────────────────────────────────────────────────────

function txIcon(type: string) {
  switch (type) {
    case "mining":
      return <Pickaxe className="w-5 h-5" />;
    case "referral":
      return <Users className="w-5 h-5" />;
    case "task":
      return <ListChecks className="w-5 h-5" />;
    case "quest":
      return <Swords className="w-5 h-5" />;
    case "achievement":
      return <Award className="w-5 h-5" />;
    case "admin_grant":
    case "admin_deduct":
      return <ShieldCheck className="w-5 h-5" />;
    case "withdrawal":
      return <ArrowUpRight className="w-5 h-5" />;
    case "deposit":
      return <ArrowDownLeft className="w-5 h-5" />;
    default:
      return <Wallet className="w-5 h-5" />;
  }
}

function txLabel(type: string): string {
  const map: Record<string, string> = {
    mining: "Mining Reward",
    referral: "Referral Reward",
    task: "Task Reward",
    quest: "Quest Reward",
    achievement: "Achievement Reward",
    admin_grant: "Admin Grant",
    admin_deduct: "Admin Deduction",
    withdrawal: "Withdrawal",
    deposit: "Deposit",
  };
  return map[type] ?? type;
}

function txColor(type: string): string {
  switch (type) {
    case "mining":
      return "bg-yellow-500/15 text-yellow-400";
    case "referral":
      return "bg-blue-500/15 text-blue-400";
    case "task":
      return "bg-emerald-500/15 text-emerald-400";
    case "quest":
      return "bg-purple-500/15 text-purple-400";
    case "achievement":
      return "bg-primary/15 text-primary";
    case "admin_grant":
      return "bg-green-500/15 text-green-400";
    case "admin_deduct":
      return "bg-red-500/15 text-red-400";
    case "withdrawal":
      return "bg-orange-500/15 text-orange-400";
    case "deposit":
      return "bg-cyan-500/15 text-cyan-400";
    default:
      return "bg-border/20 text-muted-foreground";
  }
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const DATE_FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const TYPE_FILTERS = [
  { key: "", label: "All Types" },
  { key: "mining", label: "Mining" },
  { key: "referral", label: "Referral" },
  { key: "task", label: "Tasks" },
  { key: "quest", label: "Quests" },
  { key: "achievement", label: "Achievements" },
  { key: "admin_grant", label: "Admin Grant" },
  { key: "admin_deduct", label: "Admin Deduct" },
];

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TxDetailModal({
  tx,
  onClose,
}: {
  tx: WalletTransaction;
  onClose: () => void;
}) {
  const isPositive = tx.amount >= 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txColor(tx.type)}`}>
            {txIcon(tx.type)}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount */}
        <div className="text-center">
          <p className={`text-4xl font-display font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{tx.amount.toLocaleString()} HP
          </p>
          <p className="text-sm text-muted-foreground mt-1">{txLabel(tx.type)}</p>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border/40 bg-background/60 divide-y divide-border/20">
          {[
            ["Description", tx.description],
            ["Date", format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")],
            ["Balance Before", `${tx.balanceBefore.toLocaleString()} HP`],
            ["Balance After", `${tx.balanceAfter.toLocaleString()} HP`],
            ...(tx.relatedId ? [["Reference", `#${tx.relatedId}`] as [string, string]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs text-white font-medium text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function WalletPage() {
  const { user, isAuthenticated } = useAuth();

  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  const load = useCallback(
    async (
      df: string,
      tf: string,
      s: string,
      o: number,
      append = false,
    ) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError("");

      try {
        const data = await fetchWallet({
          filter: df,
          type: tf,
          search: s,
          limit: LIMIT,
          offset: o,
        });
        setBalance(data.balance);
        setTotal(data.total);
        setOffset(o);
        if (append) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Initial load + re-load on filter change (guard: only when authenticated)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    void load(dateFilter, typeFilter, search, 0, false);
  }, [dateFilter, typeFilter, search, load, isAuthenticated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleLoadMore = () => {
    void load(dateFilter, typeFilter, search, offset + LIMIT, true);
  };

  // ── Group transactions by day ───────────────────────────────────────────────

  type TxGroup = { label: string; items: WalletTransaction[] };

  function groupByDay(txs: WalletTransaction[]): TxGroup[] {
    const groups: TxGroup[] = [];
    let current: TxGroup | null = null;

    for (const tx of txs) {
      const date = new Date(tx.createdAt);
      let label: string;
      if (isToday(date)) label = "Today";
      else if (isThisWeek(date)) label = format(date, "EEEE");
      else if (isThisMonth(date)) label = format(date, "MMM d");
      else label = format(date, "MMM d, yyyy");

      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(tx);
    }

    return groups;
  }

  const groups = groupByDay(transactions);

  return (
    <div className="flex flex-col h-full">

      {/* Balance Header */}
      <div className="px-6 pt-8 pb-6 bg-gradient-to-b from-card/80 to-transparent border-b border-border/30">
        <p className="text-xs text-muted-foreground font-display uppercase tracking-widest mb-1 text-center">
          HP Balance
        </p>
        <div className="text-5xl font-display font-bold text-white text-center tracking-tight">
          {balance.toLocaleString()}{" "}
          <span className="text-primary text-3xl">HP</span>
        </div>
        {total > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {total.toLocaleString()} total transaction{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
        {/* Date filter tabs */}
        <div className="flex gap-1.5">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === f.key
                  ? "bg-primary text-black"
                  : "bg-border/20 text-muted-foreground hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === f.key
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-border/15 text-muted-foreground hover:text-white border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === "") setSearch("");
            }}
            placeholder="Search transactions…"
            className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {error && (
          <div className="mx-0 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center border border-border/40">
              <History className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-white font-medium text-sm">No transactions found</p>
            <p className="text-muted-foreground text-xs">
              {search || typeFilter
                ? "Try adjusting your filters"
                : "Your transaction history will appear here"}
            </p>
          </div>
        ) : (
          <div className="pt-2 flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((tx) => {
                    const isPositive = tx.amount >= 0;
                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelected(tx)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-border/70 hover:bg-card/80 transition-all text-left"
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${txColor(tx.type)}`}>
                          {txIcon(tx.type)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {tx.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt), "h:mm a")}
                            {" · "}
                            <span className="capitalize">{txLabel(tx.type)}</span>
                          </p>
                        </div>

                        {/* Amount + running balance */}
                        <div className="flex flex-col items-end shrink-0">
                          <span
                            className={`text-sm font-display font-bold ${
                              isPositive ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}{tx.amount.toLocaleString()} HP
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {tx.balanceAfter.toLocaleString()} HP
                          </span>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {transactions.length < total && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-muted-foreground hover:text-white border border-border/30 rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </span>
                ) : (
                  `Load more (${(total - transactions.length).toLocaleString()} remaining)`
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <TxDetailModal tx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
