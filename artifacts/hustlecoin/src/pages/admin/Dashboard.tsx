import React, { useEffect, useState } from "react";
import { adminApi, type AdminStats } from "@/lib/adminApi";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Zap,
  Pickaxe,
  Coins,
  HandshakeIcon,
  Clock,
  Award,
  Bell,
  Gift,
  AlertTriangle,
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

interface GrantState {
  amount: string;
  reason: string;
  notify: boolean;
}

export function Dashboard() {
  const { toast } = useToast();

  // ── Stats ────────────────────────────────────────────────────────────────
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

  // ── Grant Everyone ────────────────────────────────────────────────────────
  const [grant, setGrant] = useState<GrantState>({ amount: "", reason: "", notify: true });
  const [confirming, setConfirming] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<string | null>(null);
  const [grantError, setGrantError] = useState("");

  const parsedAmount = parseInt(grant.amount, 10);
  const grantValid =
    grant.amount.trim() !== "" &&
    Number.isInteger(parsedAmount) &&
    parsedAmount > 0 &&
    grant.reason.trim() !== "";

  function handleGrantClick() {
    if (!grantValid) {
      toast({ title: "Amount (positive integer) and reason are required.", variant: "destructive" });
      return;
    }
    setGrantError("");
    setGrantResult(null);
    setConfirming(true);
  }

  async function handleConfirm() {
    setConfirming(false);
    setGranting(true);
    setGrantResult(null);
    setGrantError("");
    try {
      const res = await adminApi.grantEveryone({
        amount: parsedAmount,
        reason: grant.reason.trim(),
        notify: grant.notify,
      });
      setGrantResult(res.message);
      setGrant({ amount: "", reason: "", notify: true });
      // Refresh stats so HP circulation count updates
      adminApi.getStats().then(setStats).catch(() => null);
    } catch (e: unknown) {
      setGrantError((e as Error).message ?? "Grant failed");
    } finally {
      setGranting(false);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div>
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

      {/* ── Grant Everyone ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/30 bg-card/60 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="text-base font-display font-bold text-white">Grant Everyone</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Add HP to every non-banned user's balance in a single atomic transaction.
        </p>

        {/* Amount */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
            Amount (HP)
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={grant.amount}
            onChange={(e) => setGrant((g) => ({ ...g, amount: e.target.value }))}
            placeholder="e.g. 100"
            disabled={granting}
            className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60 disabled:opacity-50"
          />
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
            Reason
          </label>
          <input
            type="text"
            value={grant.reason}
            onChange={(e) => setGrant((g) => ({ ...g, reason: e.target.value }))}
            placeholder="e.g. Holiday bonus"
            disabled={granting}
            className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60 disabled:opacity-50"
          />
        </div>

        {/* Notify checkbox */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => !granting && setGrant((g) => ({ ...g, notify: !g.notify }))}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              grant.notify
                ? "border-primary bg-primary"
                : "border-border/60 bg-transparent"
            } ${granting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {grant.notify && (
              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
              </svg>
            )}
          </div>
          <span className="text-sm text-muted-foreground">Notify users via in-app notification</span>
        </label>

        {/* Confirmation dialog (inline) */}
        {confirming && (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-200 leading-snug">
                Are you sure you want to grant{" "}
                <span className="font-bold text-white">{parsedAmount.toLocaleString()} HP</span> to{" "}
                <span className="font-bold text-white">ALL users</span>?
                {grant.notify && " They will each receive an in-app notification."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold hover:border-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-primary text-black text-sm font-display font-bold shadow-[0_0_12px_rgba(255,170,0,0.2)] hover:bg-primary/90 transition-colors"
              >
                Confirm Grant
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {grantResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 text-sm text-center">
            ✅ {grantResult}
          </div>
        )}

        {/* Error */}
        {grantError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm text-center">
            ❌ {grantError}
          </div>
        )}

        {/* Action button */}
        {!confirming && (
          <button
            onClick={handleGrantClick}
            disabled={granting || !grantValid}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-black font-display font-bold text-sm shadow-[0_0_15px_rgba(255,170,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Gift className="w-4 h-4" />
            {granting ? "Granting…" : "Grant Everyone"}
          </button>
        )}
      </div>
    </div>
  );
}
