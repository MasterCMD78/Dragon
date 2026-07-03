import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTasks,
  useStartTask,
  useCompleteTask,
  useClaimTaskReward,
  getGetMeQueryKey,
  type TaskItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  RefreshCw,
  CalendarDays,
  Star,
  ChevronRight,
  Loader2,
} from "lucide-react";

type TabKey = "daily" | "one_time";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "daily", label: "Daily", emoji: "📅" },
  { key: "one_time", label: "One-Time", emoji: "⭐" },
];

function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-20 rounded-xl" />
    </div>
  );
}

function StatusBadge({ status }: { status: TaskItem["status"] }) {
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Done</span>
      </div>
    );
  }
  if (status === "pending_approval") {
    return (
      <div className="flex items-center gap-1 text-yellow-400/80 text-xs font-medium">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className="flex items-center gap-1 text-blue-400/80 text-xs font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Started</span>
      </div>
    );
  }
  return null;
}

function TaskIcon({ category, status }: { category: TaskItem["category"]; status: TaskItem["status"] }) {
  const base = "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0";
  if (status === "completed") {
    return (
      <div className={`${base} bg-emerald-500/15 border border-emerald-500/20`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      </div>
    );
  }
  if (category === "daily") {
    return (
      <div className={`${base} bg-primary/15 border border-primary/20`}>
        <CalendarDays className="w-5 h-5 text-primary" />
      </div>
    );
  }
  return (
    <div className={`${base} bg-violet-500/15 border border-violet-500/20`}>
      <Star className="w-5 h-5 text-violet-400" />
    </div>
  );
}

interface TaskCardProps {
  task: TaskItem;
  onAction: (task: TaskItem) => Promise<void>;
  loadingId: number | null;
}

function TaskCard({ task, onAction, loadingId }: TaskCardProps) {
  const isLoading = loadingId === task.id;
  const isCompleted = task.status === "completed" && !task.canClaim;
  const isPending = task.status === "pending_approval";

  function actionLabel(): string {
    if (task.canClaim) return "Claim";
    if (task.status === "completed") return "Done";
    if (task.status === "pending_approval") return "Pending";
    if (task.status === "in_progress") return "Verify";
    return "Start";
  }

  function actionStyle(): string {
    if (task.canClaim) return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30";
    if (isCompleted) return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/50 cursor-default";
    if (isPending) return "bg-yellow-400/10 border border-yellow-400/20 text-yellow-400/60 cursor-default";
    if (task.status === "in_progress") return "bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30";
    return "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30";
  }

  const disabled = (isCompleted || isPending) && !task.canClaim;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
        isCompleted
          ? "border-border/30 bg-card/50 opacity-70"
          : "border-border/50 bg-card"
      }`}
    >
      <TaskIcon category={task.category} status={task.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`font-medium text-sm leading-tight truncate ${isCompleted ? "text-muted-foreground" : "text-white"}`}>
            {task.title}
          </p>
          {task.link && task.status !== "completed" && (
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status !== "available" ? (
            <StatusBadge status={task.status} />
          ) : (
            <p className="text-muted-foreground text-xs truncate">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Coins className="w-3 h-3 text-primary shrink-0" />
          <span className="text-primary text-xs font-medium">+{task.reward} HP</span>
        </div>
      </div>

      <button
        disabled={disabled || isLoading}
        onClick={() => !disabled && onAction(task)}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${actionStyle()} ${
          isLoading ? "opacity-60 cursor-wait" : ""
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : (
          <>
            {actionLabel()}
            {!isPending && !isCompleted && <ChevronRight className="w-3 h-3" />}
          </>
        )}
      </button>
    </motion.div>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-3xl">{tab === "daily" ? "📅" : "⭐"}</span>
      </div>
      <div>
        <p className="text-white font-medium mb-1">
          {tab === "daily" ? "All Daily Tasks Done!" : "No Tasks Yet"}
        </p>
        <p className="text-muted-foreground text-sm">
          {tab === "daily"
            ? "Come back tomorrow for new rewards."
            : "Check back soon for tasks to complete."}
        </p>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<TabKey>("daily");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const { data, isLoading, refetch } = useGetTasks();

  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const claimReward = useClaimTaskReward();

  const tasks = data?.tasks ?? [];
  const daily = tasks.filter((t) => t.category === "daily");
  const oneTime = tasks.filter((t) => t.category === "one_time");
  const visible = activeTab === "daily" ? daily : oneTime;

  const completedCount = visible.filter((t) => t.status === "completed").length;
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

  const handleAction = useCallback(
    async (task: TaskItem) => {
      setLoadingId(task.id);
      try {
        if (task.canClaim) {
          await claimReward.mutateAsync({ id: task.id });
          toast({ title: `+${task.reward} HP claimed! 🎉`, description: task.title });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          refetch();
          return;
        }

        if (task.status === "available") {
          if (task.link) {
            window.open(task.link, "_blank");
          }
          await startTask.mutateAsync({ id: task.id });
          refetch();
          return;
        }

        if (task.status === "in_progress") {
          const result = await completeTask.mutateAsync({ id: task.id });
          if (result.status === "completed") {
            toast({ title: `+${result.reward} HP earned! 🎉`, description: task.title });
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          } else {
            toast({ title: "Submitted for review", description: "You'll be notified once approved." });
          }
          refetch();
          return;
        }

        // Auto-complete for tasks with no start/verify distinction (automatic type)
        const result = await completeTask.mutateAsync({ id: task.id });
        if (result.status === "completed") {
          toast({ title: `+${result.reward} HP earned! 🎉`, description: task.title });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } else {
          toast({ title: "Submitted for review", description: "You'll be notified once approved." });
        }
        refetch();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Something went wrong";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoadingId(null);
      }
    },
    [claimReward, startTask, completeTask, toast, refetch, queryClient],
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
          <h1 className="text-2xl font-display font-bold text-white">Tasks</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl text-muted-foreground hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-muted-foreground text-sm">Complete tasks to earn HustleCoin HP</p>

        {/* Balance pill */}
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
            const count = tab.key === "daily" ? daily.length : oneTime.length;
            const doneCount =
              tab.key === "daily"
                ? daily.filter((t) => t.status === "completed").length
                : oneTime.filter((t) => t.status === "completed").length;
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
              {completedCount} of {totalCount} completed
            </span>
            <span className="text-xs text-primary font-medium">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {/* Available first, then completed */}
              {[
                ...visible.filter((t) => t.status !== "completed"),
                ...visible.filter((t) => t.status === "completed"),
              ].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAction={handleAction}
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
