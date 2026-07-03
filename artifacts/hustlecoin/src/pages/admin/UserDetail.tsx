import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { adminApi, type AdminUserDetail } from "@/lib/adminApi";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Ban,
  Crown,
  Pickaxe,
  Zap,
  RotateCcw,
  Plus,
  Minus,
  Copy,
} from "lucide-react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
      <div className="w-full max-w-[400px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4">
        <p className="text-white text-sm text-center">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface HPDialogProps {
  mode: "add" | "remove";
  onConfirm: (amount: number, reason: string) => void;
  onCancel: () => void;
}

function HPDialog({ mode, onConfirm, onCancel }: HPDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
      <div className="w-full max-w-[400px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-white font-semibold text-center">
          {mode === "add" ? "Add HP" : "Remove HP"}
        </h3>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const n = parseInt(amount, 10);
              if (!n || n <= 0) return;
              onConfirm(mode === "add" ? n : -n, reason);
            }}
            className="flex-1 py-3 rounded-xl bg-primary text-black text-sm font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  action: string;
  variant?: "destructive" | "warning" | "default";
}

export function UserDetail({ telegramId }: { telegramId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [hpDialog, setHpDialog] = useState<"add" | "remove" | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getUser(telegramId)
      .then(setDetail)
      .catch(() => toast({ title: "Failed to load user", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [telegramId, toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (action: () => Promise<unknown>, successMsg: string) => {
    setActing(true);
    setConfirm(null);
    try {
      await action();
      toast({ title: successMsg });
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const confirmAct = (message: string, action: () => Promise<unknown>, successMsg: string) => {
    setConfirm({ message, onConfirm: () => act(action, successMsg) });
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!detail) return null;
  const { user, stats, recentTransactions } = detail;

  return (
    <div className="overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <button onClick={() => navigate("/admin/users")} className="p-1">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="text-white font-semibold truncate">
          {[user.firstName, user.lastName].filter(Boolean).join(" ") || (user.username && user.username !== "user" ? `@${user.username}` : user.telegramId)}
        </span>
        {user.isAdmin && <Crown className="w-4 h-4 text-primary" />}
        {user.isBanned && <Ban className="w-4 h-4 text-destructive" />}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Basic info */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">
              {(user.firstName || user.telegramId).charAt(0).toUpperCase()}
            </div>
            <div className="flex gap-1.5">
              {user.isBanned && (
                <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">Banned</span>
              )}
              {user.isAdmin && (
                <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">Admin</span>
              )}
            </div>
          </div>

          {[
            ["Telegram ID", user.telegramId],
            ["Username", user.username && user.username !== "user" ? `@${user.username}` : "—"],
            ["Full name", `${user.firstName} ${user.lastName ?? ""}`.trim() || user.telegramId],
            ["Referred by", user.referredBy ?? "—"],
            ["Language", user.languageCode ?? "—"],
            ["Joined", new Date(user.joinDate).toLocaleDateString()],
            ["Last active", new Date(user.lastActive).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-white font-medium">{value}</span>
                {label === "Telegram ID" && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(user.telegramId); toast({ title: "Copied!" }); }}
                    className="p-0.5 text-muted-foreground hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "HP Balance", value: user.balance.toLocaleString() },
            { label: "Level", value: user.level },
            { label: "Streak", value: user.streak },
            { label: "Total Mines", value: user.totalMines },
            { label: "Tasks Done", value: stats.tasksCompleted },
            { label: "Quests Done", value: stats.questsCompleted },
            { label: "Achievements", value: stats.achievementsUnlocked },
            { label: "Referrals", value: stats.totalReferrals },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border/30 bg-card/40 p-2.5 flex flex-col gap-0.5">
              <span className="text-lg font-bold text-white leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* HP Actions */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">HP Actions</p>
          <div className="flex gap-2">
            <button
              onClick={() => setHpDialog("add")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add HP
            </button>
            <button
              onClick={() => setHpDialog("remove")}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold disabled:opacity-50"
            >
              <Minus className="w-4 h-4" /> Remove HP
            </button>
          </div>
        </div>

        {/* User controls */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Controls</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                confirmAct(
                  user.isBanned ? "Unban this user?" : "Ban this user? They will lose access.",
                  () => user.isBanned ? adminApi.unbanUser(telegramId) : adminApi.banUser(telegramId),
                  user.isBanned ? "User unbanned" : "User banned",
                )
              }
              disabled={acting}
              className={`py-3 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                user.isBanned
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              {user.isBanned ? "Unban" : "Ban"}
            </button>
            <button
              onClick={() =>
                confirmAct(
                  user.isAdmin ? "Remove admin status?" : "Grant admin status?",
                  () => user.isAdmin ? adminApi.removeAdmin(telegramId) : adminApi.makeAdmin(telegramId),
                  user.isAdmin ? "Admin removed" : "Admin granted",
                )
              }
              disabled={acting}
              className="py-3 rounded-xl text-sm font-semibold border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 disabled:opacity-50"
            >
              {user.isAdmin ? "Remove Admin" : "Make Admin"}
            </button>
            <button
              onClick={() => confirmAct("Reset this user's mining session?", () => adminApi.resetMining(telegramId), "Mining reset")}
              disabled={acting}
              className="py-3 rounded-xl text-sm font-semibold border border-border/40 bg-border/10 text-muted-foreground hover:text-white disabled:opacity-50"
            >
              Reset Mining
            </button>
            <button
              onClick={() => confirmAct("Reset streak to 0?", () => adminApi.resetStreak(telegramId), "Streak reset")}
              disabled={acting}
              className="py-3 rounded-xl text-sm font-semibold border border-border/40 bg-border/10 text-muted-foreground hover:text-white disabled:opacity-50"
            >
              Reset Streak
            </button>
            <button
              onClick={() => confirmAct("Reset today's task completions?", () => adminApi.resetTasks(telegramId), "Tasks reset")}
              disabled={acting}
              className="py-3 rounded-xl text-sm font-semibold border border-border/40 bg-border/10 text-muted-foreground hover:text-white disabled:opacity-50"
            >
              Reset Tasks
            </button>
            <button
              onClick={() => confirmAct("Reset today's quest progress?", () => adminApi.resetQuests(telegramId), "Quests reset")}
              disabled={acting}
              className="py-3 rounded-xl text-sm font-semibold border border-border/40 bg-border/10 text-muted-foreground hover:text-white disabled:opacity-50"
            >
              Reset Quests
            </button>
          </div>
        </div>

        {/* Recent transactions */}
        {recentTransactions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
              Recent Transactions
            </p>
            <div className="flex flex-col gap-1.5">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/30 bg-card/40"
                >
                  <div>
                    <p className="text-xs text-white font-medium">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()} · {tx.type}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}{tx.amount} HP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {hpDialog && (
        <HPDialog
          mode={hpDialog}
          onConfirm={(amount, reason) => {
            setHpDialog(null);
            act(() => adminApi.adjustHP(telegramId, amount, reason), `HP ${amount > 0 ? "added" : "deducted"} successfully`);
          }}
          onCancel={() => setHpDialog(null)}
        />
      )}
    </div>
  );
}
