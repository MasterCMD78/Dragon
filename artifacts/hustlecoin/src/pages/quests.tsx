import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetQuests,
  useUpdateQuestProgress,
  useClaimQuestReward,
  getGetMeQueryKey,
  type QuestItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Coins,
  RefreshCw,
  Loader2,
  Sparkles,
  CalendarDays,
  CalendarRange,
  TrendingUp,
} from "lucide-react";

type TabKey = "daily" | "weekly";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "daily", label: "Daily", emoji: "📅" },
  { key: "weekly", label: "Weekly", emoji: "📆" },
];

function QuestSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-border/50 bg-card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

function QuestIcon({ quest }: { quest: QuestItem }) {
  const base = "w-11 h-11 rounded-xl flex items-center justify-center shrink-0";
  if (quest.claimed) {
    return (
      <div className={`${base} bg-emerald-500/15 border border-emerald-500/20`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      </div>
    );
  }
  if (quest.completed) {
    return (
      <div className={`${base} bg-primary/20 border border-primary/30`}>
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
    );
  }
  if (quest.category === "weekly") {
    return (
      <div className={`${base} bg-violet-500/15 border border-violet-500/20`}>
        <CalendarRange className="w-5 h-5 text-violet-400" />
      </div>
    );
  }
  return (
    <div className={`${base} bg-blue-500/15 border border-blue-500/20`}>
      <CalendarDays className="w-5 h-5 text-blue-400" />
    </div>
  );
}

interface QuestCardProps {
  quest: QuestItem;
  onClaim: (quest: QuestItem) => Promise<void>;
  onProgress: (quest: QuestItem) => Promise<void>;
  loadingId: number | null;
}

function QuestCard({ quest, onClaim, onProgress, loadingId }: QuestCardProps) {
  const isLoading = loadingId === quest.id;
  const pct = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`p-4 rounded-2xl border transition-all ${
        quest.claimed
          ? "border-border/30 bg-card/50 opacity-70"
          : quest.completed
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 bg-card"
      }`}
    >
      {/* Top row */}
      <div className="flex items-center gap-3 mb-3">
        <QuestIcon quest={quest} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`font-medium text-sm truncate ${quest.claimed ? "text-muted-foreground" : "text-white"}`}>
              {quest.title}
            </p>
            {quest.claimed && (
              <span className="shrink-0 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                Done
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs truncate">{quest.description}</p>
          <div className="flex items-center gap-1 mt-1">
            <Coins className="w-3 h-3 text-primary shrink-0" />
            <span className="text-primary text-xs font-medium">+{quest.reward} HP</span>
          </div>
        </div>

        {/* Action button */}
        {quest.claimed ? (
          <div className="shrink-0 flex items-center gap-1 text-emerald-400/60 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        ) : quest.completed ? (
          <button
            disabled={isLoading}
            onClick={() => onClaim(quest)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-primary to-orange-500 text-black shadow-[0_0_12px_rgba(255,170,0,0.3)] hover:shadow-[0_0_20px_rgba(255,170,0,0.45)] ${isLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Claim
              </>
            )}
          </button>
        ) : (
          <button
            disabled={isLoading}
            onClick={() => onProgress(quest)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all bg-border/30 text-muted-foreground hover:bg-border/50 hover:text-white ${isLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                Sync
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-muted-foreground">
            {quest.progress} / {quest.target}
          </span>
          <span className={`text-xs font-medium ${pct >= 100 ? "text-primary" : "text-muted-foreground"}`}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              quest.claimed
                ? "bg-emerald-500/60"
                : quest.completed
                ? "bg-gradient-to-r from-primary to-orange-500"
                : "bg-blue-500/60"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-3xl">{tab === "daily" ? "📅" : "📆"}</span>
      </div>
      <div>
        <p className="text-white font-medium mb-1">
          {tab === "daily" ? "No Daily Quests" : "No Weekly Quests"}
        </p>
        <p className="text-muted-foreground text-sm">Check back soon!</p>
      </div>
    </div>
  );
}

export default function Quests() {
  const [activeTab, setActiveTab] = useState<TabKey>("daily");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const { data, isLoading, refetch } = useGetQuests();
  const updateProgress = useUpdateQuestProgress();
  const claimReward = useClaimQuestReward();

  const quests = data?.quests ?? [];
  const daily = quests.filter((q) => q.category === "daily");
  const weekly = quests.filter((q) => q.category === "weekly");
  const visible = activeTab === "daily" ? daily : weekly;

  const claimedCount = visible.filter((q) => q.claimed).length;
  const totalCount = visible.length;

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

  const handleProgress = useCallback(
    async (quest: QuestItem) => {
      setLoadingId(quest.id);
      try {
        await updateProgress.mutateAsync({ id: quest.id });
        refetch();
      } catch {
        toast({ title: "Error syncing progress", variant: "destructive" });
      } finally {
        setLoadingId(null);
      }
    },
    [updateProgress, refetch, toast],
  );

  const handleClaim = useCallback(
    async (quest: QuestItem) => {
      setLoadingId(quest.id);
      try {
        const result = await claimReward.mutateAsync({ id: quest.id });
        toast({
          title: `+${result.reward} HP claimed! 🎉`,
          description: quest.title,
        });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        refetch();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Something went wrong";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoadingId(null);
      }
    },
    [claimReward, toast, queryClient, refetch],
  );

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-display font-bold text-white">Quests</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-muted-foreground text-sm">Track your progress and earn bonus HP</p>

        {user && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/25">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-display font-bold text-sm">
              {user.balance.toLocaleString()} HP
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 shrink-0">
        <div className="flex gap-1 bg-black/40 rounded-2xl p-1 border border-border/30">
          {TABS.map((tab) => {
            const count = tab.key === "daily" ? daily.length : weekly.length;
            const doneCount =
              tab.key === "daily"
                ? daily.filter((q) => q.claimed).length
                : weekly.filter((q) => q.claimed).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-black shadow"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {!isLoading && count > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0.5 ${
                      activeTab === tab.key
                        ? "bg-black/20 text-black/70"
                        : "bg-border/40 text-muted-foreground"
                    }`}
                  >
                    {doneCount}/{count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      {!isLoading && totalCount > 0 && (
        <div className="px-5 mt-3 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {claimedCount} of {totalCount} claimed
            </span>
            <span className="text-xs text-primary font-medium">
              {Math.round((claimedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(claimedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Quest list */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <QuestSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {[
                ...visible.filter((q) => !q.claimed),
                ...visible.filter((q) => q.claimed),
              ].map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={handleClaim}
                  onProgress={handleProgress}
                  loadingId={loadingId}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
