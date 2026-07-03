import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAchievements,
  useCheckAchievements,
  getGetAchievementsQueryKey,
  type AchievementItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Lock,
  CheckCircle2,
  Coins,
  Sparkles,
  Search,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------
type Tier = "bronze" | "silver" | "gold" | "diamond";

const TIER_CONFIG: Record<
  Tier,
  { label: string; icon: string; text: string; bg: string; border: string; glow: string }
> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/25",
    glow: "shadow-[0_0_12px_rgba(251,146,60,0.25)]",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    text: "text-slate-300",
    bg: "bg-slate-500/15",
    border: "border-slate-400/25",
    glow: "shadow-[0_0_12px_rgba(148,163,184,0.2)]",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    text: "text-primary",
    bg: "bg-primary/15",
    border: "border-primary/25",
    glow: "shadow-[0_0_12px_rgba(255,170,0,0.3)]",
  },
  diamond: {
    label: "Diamond",
    icon: "💎",
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/25",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.25)]",
  },
};

type FilterKey = "all" | Tier;
const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "✨" },
  { key: "diamond", label: "Diamond", icon: "💎" },
  { key: "gold", label: "Gold", icon: "🥇" },
  { key: "silver", label: "Silver", icon: "🥈" },
  { key: "bronze", label: "Bronze", icon: "🥉" },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function AchievementSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-border/50 bg-card flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-1.5 w-full rounded-full mt-1" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievement Card
// ---------------------------------------------------------------------------
function AchievementCard({ achievement }: { achievement: AchievementItem }) {
  const tier = achievement.tier as Tier;
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze;
  const pct =
    achievement.target > 0
      ? Math.min((achievement.progress / achievement.target) * 100, 100)
      : 0;

  const unlockedDate = achievement.unlockedAt
    ? new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`p-4 rounded-2xl border transition-all ${
        achievement.unlocked
          ? `${cfg.border} ${cfg.bg} ${cfg.glow}`
          : "border-border/40 bg-card/60 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl relative ${
            achievement.unlocked ? cfg.bg : "bg-border/20"
          }`}
        >
          {achievement.icon}
          {!achievement.unlocked && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p
              className={`font-semibold text-sm truncate ${
                achievement.unlocked ? "text-white" : "text-muted-foreground"
              }`}
            >
              {achievement.title}
            </p>

            {/* Tier badge */}
            <span
              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.text} ${cfg.bg} ${cfg.border}`}
            >
              {cfg.icon} {cfg.label}
            </span>

            {/* Unlocked badge */}
            {achievement.unlocked && !achievement.rewarded && (
              <span className="shrink-0 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                Unlocked
              </span>
            )}

            {/* Rewarded badge */}
            {achievement.rewarded && (
              <span
                className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${cfg.text} ${cfg.bg} ${cfg.border}`}
              >
                <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />+{achievement.reward} HP
              </span>
            )}
          </div>

          <p className="text-muted-foreground text-xs leading-snug line-clamp-2">
            {achievement.description}
          </p>

          {/* Unlock date */}
          {achievement.unlocked && unlockedDate && (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-400">{unlockedDate}</span>
            </div>
          )}

          {/* HP reward info for locked achievements */}
          {!achievement.unlocked && (
            <div className="flex items-center gap-1 mt-1">
              <Coins className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground">
                +{achievement.reward} HP on unlock
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar — always shown */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-muted-foreground">
            {achievement.unlocked
              ? "Completed"
              : `${achievement.progress.toLocaleString()} / ${achievement.target.toLocaleString()}`}
          </span>
          <span
            className={`text-[11px] font-medium ${
              pct >= 100
                ? cfg.text
                : "text-muted-foreground"
            }`}
          >
            {achievement.unlocked ? "100%" : `${Math.round(pct)}%`}
          </span>
        </div>
        <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              achievement.unlocked
                ? `bg-gradient-to-r ${
                    tier === "bronze"
                      ? "from-orange-500 to-orange-400"
                      : tier === "silver"
                      ? "from-slate-400 to-slate-300"
                      : tier === "gold"
                      ? "from-primary to-orange-400"
                      : "from-cyan-500 to-cyan-300"
                  }`
                : "bg-border/50"
            }`}
            initial={{ width: 0 }}
            animate={{ width: achievement.unlocked ? "100%" : `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Search className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-white font-medium mb-1">
          {filter === "all" ? "No Achievements Found" : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Achievements`}
        </p>
        <p className="text-muted-foreground text-sm">Check back after more activity!</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Achievements() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const { data, isLoading, refetch } = useGetAchievements();
  const checkMutation = useCheckAchievements();

  const achievements = data?.achievements ?? [];

  // Sort: unlocked first (rewarded on top), then locked sorted by progress % desc
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked && b.unlocked) {
      // Rewarded (post-launch) first, then historical
      if (a.rewarded !== b.rewarded) return a.rewarded ? -1 : 1;
      return 0;
    }
    // Both locked: sort by progress % descending
    const aPct = a.target > 0 ? a.progress / a.target : 0;
    const bPct = b.target > 0 ? b.progress / b.target : 0;
    return bPct - aPct;
  });

  const visible =
    activeFilter === "all"
      ? sorted
      : sorted.filter((a) => a.tier === activeFilter);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const overallPct = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    if (delta > 60) handleRefresh();
    touchStartY.current = null;
  };

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await checkMutation.mutateAsync();
      if (result.newUnlocks.length > 0) {
        toast({
          title: `🏆 ${result.newUnlocks.length} Achievement${result.newUnlocks.length > 1 ? "s" : ""} Unlocked!`,
          description: result.newUnlocks.map((u) => `${u.icon} ${u.title}`).join("  "),
        });
        queryClient.invalidateQueries({ queryKey: getGetAchievementsQueryKey() });
        refetch();
      } else {
        toast({ title: "No new achievements yet", description: "Keep grinding! 💪" });
      }
    } catch {
      toast({ title: "Scan failed", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [checkMutation, toast, queryClient, refetch]);

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-display font-bold text-white">Achievements</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={scanning}
              title="Scan for new achievements"
              className="p-2 rounded-xl text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl text-muted-foreground hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Milestones earned on your journey</p>

        {user && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-display font-bold text-sm">
              {user.balance.toLocaleString()} HP
            </span>
          </div>
        )}
      </div>

      {/* Overall progress bar */}
      {!isLoading && totalCount > 0 && (
        <div className="px-5 mb-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {unlockedCount} of {totalCount} unlocked
            </span>
            <span className="text-xs text-primary font-medium">
              {Math.round(overallPct)}%
            </span>
          </div>
          <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Tier filter tabs */}
      <div className="px-5 shrink-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map((f) => {
            const count =
              f.key === "all"
                ? achievements.length
                : achievements.filter((a) => a.tier === f.key).length;
            const unlockedForFilter =
              f.key === "all"
                ? unlockedCount
                : achievements.filter((a) => a.tier === f.key && a.unlocked).length;

            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === f.key
                    ? "bg-primary text-black shadow"
                    : "bg-border/20 text-muted-foreground hover:text-white hover:bg-border/30"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
                {!isLoading && count > 0 && (
                  <span
                    className={`text-[10px] rounded-full px-1 ${
                      activeFilter === f.key
                        ? "bg-black/20 text-black/70"
                        : "bg-border/40 text-muted-foreground"
                    }`}
                  >
                    {unlockedForFilter}/{count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievement list */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <AchievementSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {visible.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
