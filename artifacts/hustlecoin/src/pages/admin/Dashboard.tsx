import React, { useEffect, useState, useRef, useCallback } from "react";
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
  RotateCcw,
  Eye,
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

type GrantStep = "idle" | "loading_preview" | "confirming" | "granting" | "done";

interface PreviewData {
  userCount: number;
  totalHP: number;
  currentCirculatingHP: number;
  estimatedNewCirculatingHP: number;
}

interface LastGrantInfo {
  id: number;
  batchId: string | null;
  details: string | null;
  createdAt: string;
  adminTelegramId: string;
}

export function Dashboard() {
  const { toast } = useToast();

  // ── Stats ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const refreshStats = useCallback(() => {
    adminApi.getStats().then(setStats).catch(() => null);
  }, []);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((e: Error) => setStatsError(e.message))
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Last grant (server state — persists across page reloads & devices) ───
  const [lastGrant, setLastGrant] = useState<LastGrantInfo | null>(null);
  const [canRollback, setCanRollback] = useState(false);
  const [lastGrantLoading, setLastGrantLoading] = useState(true);

  const refreshLastGrant = useCallback(() => {
    adminApi
      .getLastGrant()
      .then(({ lastGrant: lg, canRollback: cr }) => {
        setLastGrant(lg);
        setCanRollback(cr);
      })
      .catch(() => null)
      .finally(() => setLastGrantLoading(false));
  }, []);

  useEffect(() => {
    refreshLastGrant();
  }, [refreshLastGrant]);

  // ── Grant form state ──────────────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [step, setStep] = useState<GrantStep>("idle");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [grantResult, setGrantResult] = useState<string | null>(null);
  const [grantError, setGrantError] = useState("");

  // 60-second cooldown after a successful grant
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // Validation: amount must be integer 1–5000
  const parsedAmount = parseInt(amount, 10);
  const amountValid =
    amount.trim() !== "" && Number.isInteger(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 5000;
  const formValid = amountValid && reason.trim() !== "";

  // ── Rollback ──────────────────────────────────────────────────────────────
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState("");

  async function handleRollback() {
    if (
      !confirm(
        "Emergency rollback: deduct the last grant amount from every user's current balance (floor 0). This cannot be undone. Continue?",
      )
    )
      return;
    setRollingBack(true);
    setRollbackResult(null);
    setRollbackError("");
    try {
      const res = await adminApi.rollbackLastGrant();
      setRollbackResult(res.message);
      setCanRollback(false);
      refreshStats();
    } catch (e: unknown) {
      setRollbackError((e as Error).message ?? "Rollback failed");
    } finally {
      setRollingBack(false);
    }
  }

  // ── Grant flow ────────────────────────────────────────────────────────────

  async function handlePreview() {
    if (!formValid) {
      toast({ title: "Enter a valid amount (1–5,000) and a reason.", variant: "destructive" });
      return;
    }
    setGrantError("");
    setGrantResult(null);
    setConfirmText("");
    setStep("loading_preview");
    try {
      const data = await adminApi.grantEveryonePreview(parsedAmount);
      setPreview(data);
      setStep("confirming");
    } catch (e: unknown) {
      setGrantError((e as Error).message ?? "Failed to load preview");
      setStep("idle");
    }
  }

  async function handleConfirm() {
    if (confirmText !== "GRANT") {
      toast({ title: 'Type "GRANT" to confirm.', variant: "destructive" });
      return;
    }
    setStep("granting");
    setGrantResult(null);
    setGrantError("");
    try {
      const res = await adminApi.grantEveryone({
        amount: parsedAmount,
        reason: reason.trim(),
        notify,
      });
      setGrantResult(res.message);
      setAmount("");
      setReason("");
      setNotify(true);
      setConfirmText("");
      setPreview(null);
      setStep("done");
      startCooldown();
      refreshStats();
      // Refresh last-grant from server so rollback panel reflects new grant
      refreshLastGrant();
    } catch (e: unknown) {
      setGrantError((e as Error).message ?? "Grant failed");
      setStep("idle");
    }
  }

  function resetGrant() {
    setStep("idle");
    setPreview(null);
    setConfirmText("");
    setGrantError("");
  }

  // Shorthand for "a UI action is in flight"
  const inFlight = step === "loading_preview" || step === "granting";

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-display font-bold text-white mb-4">Overview</h2>

        {statsError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
            {statsError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-border/40 bg-card/60 p-4 flex flex-col gap-2"
            >
              <div className={card.color}>{card.icon}</div>
              {statsLoading ? (
                <>
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-28" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-display font-bold text-white leading-none">
                    {stats
                      ? card.format
                        ? card.format(stats[card.key])
                        : stats[card.key].toLocaleString()
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
          Add HP to every non-banned user's balance. Max 5,000 HP per grant. Same amount + reason
          within 10 minutes is blocked.
        </p>

        {/* ─ Idle / form ─ */}
        {step === "idle" && (
          <>
            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Amount (HP · 1–5,000)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60"
              />
              {amount.trim() !== "" && !amountValid && (
                <p className="text-xs text-destructive mt-0.5">
                  Must be a whole number between 1 and 5,000.
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Holiday bonus"
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/60"
              />
            </div>

            {/* Notify checkbox */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setNotify((n) => !n)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                  notify ? "border-primary bg-primary" : "border-border/60 bg-transparent"
                }`}
              >
                {notify && (
                  <svg
                    className="w-3 h-3 text-black"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Notify users via in-app notification
              </span>
            </label>

            {grantError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm text-center">
                ❌ {grantError}
              </div>
            )}

            {/* Preview button */}
            <button
              onClick={handlePreview}
              disabled={!formValid || cooldown > 0}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-primary text-black font-display font-bold text-sm shadow-[0_0_15px_rgba(255,170,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {cooldown > 0 ? `Cooldown — ${cooldown}s` : "Preview Grant"}
            </button>
          </>
        )}

        {/* ─ Loading preview ─ */}
        {step === "loading_preview" && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-4/5 rounded-lg" />
            <Skeleton className="h-5 w-3/5 rounded-lg" />
          </div>
        )}

        {/* ─ Preview + type-GRANT confirmation ─ */}
        {step === "confirming" && preview && (
          <>
            {/* Preview card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">
                Grant Preview
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Users receiving HP</p>
                  <p className="font-bold text-white">{preview.userCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount per user</p>
                  <p className="font-bold text-white">{parsedAmount.toLocaleString()} HP</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total distribution</p>
                  <p className="font-bold text-primary">{preview.totalHP.toLocaleString()} HP</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Est. new circulating</p>
                  <p className="font-bold text-white">
                    {preview.estimatedNewCirculatingHP.toLocaleString()} HP
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reason:{" "}
                <span className="text-white font-semibold">{reason.trim()}</span>
              </p>
            </div>

            {/* Type GRANT confirmation */}
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-200 leading-snug">
                  This will grant{" "}
                  <span className="font-bold text-white">
                    {parsedAmount.toLocaleString()} HP
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-white">
                    {preview.userCount.toLocaleString()} users
                  </span>
                  . Type{" "}
                  <span className="font-mono font-bold text-white">GRANT</span> below to
                  confirm.
                </p>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type GRANT"
                className="w-full bg-background border border-orange-500/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-400 font-mono tracking-widest"
                autoComplete="off"
                autoCapitalize="characters"
              />
              <div className="flex gap-2">
                <button
                  onClick={resetGrant}
                  className="flex-1 py-2.5 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold hover:border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmText !== "GRANT"}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-black text-sm font-display font-bold shadow-[0_0_12px_rgba(255,170,0,0.2)] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Grant
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─ Granting spinner ─ */}
        {step === "granting" && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Granting HP to all users…
          </div>
        )}

        {/* ─ Done ─ */}
        {step === "done" && (
          <>
            {grantResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 text-sm text-center">
                ✅ {grantResult}
              </div>
            )}
            {cooldown > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Next grant available in{" "}
                <span className="text-white font-bold">{cooldown}s</span>
              </p>
            )}
            <button
              onClick={() => {
                setStep("idle");
                setGrantResult(null);
              }}
              className="w-full py-2.5 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold hover:text-white hover:border-border transition-colors"
            >
              New Grant
            </button>
          </>
        )}

        {/* Non-step-clearing errors (should not appear during confirming/done) */}
        {!inFlight && step !== "confirming" && step !== "done" && grantError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm text-center">
            ❌ {grantError}
          </div>
        )}
      </div>

      {/* ── Emergency Rollback (driven by server state — persists across reloads) ── */}
      {(canRollback || lastGrantLoading) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-display font-bold text-red-300">Emergency Rollback</h3>
          </div>

          {lastGrantLoading ? (
            <Skeleton className="h-4 w-full rounded" />
          ) : lastGrant ? (
            <p className="text-xs text-muted-foreground">
              Last grant:{" "}
              <span className="text-white font-semibold">
                {lastGrant.details
                  ?.match(/amount=(\d+)/)?.[1]
                  ? `${lastGrant.details.match(/amount=(\d+)/)?.[1]} HP`
                  : "unknown amount"}
              </span>{" "}
              ·{" "}
              <span className="text-muted-foreground">
                {new Date(lastGrant.createdAt).toLocaleString()}
              </span>
              . Rollback deducts this amount from every user's current balance (floor 0). One-time
              only.
            </p>
          ) : null}

          {rollbackResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 text-sm">
              ✅ {rollbackResult}
            </div>
          )}
          {rollbackError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
              ❌ {rollbackError}
            </div>
          )}

          <button
            onClick={handleRollback}
            disabled={rollingBack || !!rollbackResult || !canRollback}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            {rollingBack
              ? "Rolling back…"
              : rollbackResult
                ? "Rolled Back"
                : "Rollback Last Grant"}
          </button>
        </div>
      )}
    </div>
  );
}
