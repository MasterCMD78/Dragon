import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useGetNotificationsUnreadCount,
  getGetNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
  type NotificationItem,
  type GetNotificationsParams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BellOff,
  CheckCheck,
  RefreshCw,
  ChevronRight,
  Pickaxe,
  Users,
  Trophy,
  ListChecks,
  Swords,
  Award,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type FilterKey = "all" | "mining" | "referral" | "task" | "quest" | "achievement" | "system";
type NotifType = GetNotificationsParams["type"];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------
const FILTERS: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Bell className="w-3.5 h-3.5" /> },
  { key: "mining", label: "Mining", icon: <Pickaxe className="w-3.5 h-3.5" /> },
  { key: "referral", label: "Referrals", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "task", label: "Tasks", icon: <ListChecks className="w-3.5 h-3.5" /> },
  { key: "quest", label: "Quests", icon: <Swords className="w-3.5 h-3.5" /> },
  { key: "achievement", label: "Achievements", icon: <Award className="w-3.5 h-3.5" /> },
  { key: "system", label: "System", icon: <Info className="w-3.5 h-3.5" /> },
];

// ---------------------------------------------------------------------------
// Type → route navigation
// ---------------------------------------------------------------------------
const TYPE_ROUTE: Record<string, string> = {
  mining: "/",
  referral: "/referrals",
  task: "/tasks",
  quest: "/quests",
  achievement: "/achievements",
};

// ---------------------------------------------------------------------------
// Type → icon + colors
// ---------------------------------------------------------------------------
const TYPE_STYLE: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string }
> = {
  mining: {
    icon: <Pickaxe className="w-4 h-4" />,
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
  },
  referral: {
    icon: <Users className="w-4 h-4" />,
    bg: "bg-blue-500/15",
    text: "text-blue-400",
  },
  task: {
    icon: <ListChecks className="w-4 h-4" />,
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
  },
  quest: {
    icon: <Swords className="w-4 h-4" />,
    bg: "bg-purple-500/15",
    text: "text-purple-400",
  },
  achievement: {
    icon: <Award className="w-4 h-4" />,
    bg: "bg-primary/15",
    text: "text-primary",
  },
  system: {
    icon: <Info className="w-4 h-4" />,
    bg: "bg-slate-500/15",
    text: "text-slate-400",
  },
};

function getTypeStyle(type: string) {
  return (
    TYPE_STYLE[type] ?? {
      icon: <Bell className="w-4 h-4" />,
      bg: "bg-border/20",
      text: "text-muted-foreground",
    }
  );
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/40 bg-card/60">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification card
// ---------------------------------------------------------------------------
function NotifCard({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: (id: number) => void;
}) {
  const [, navigate] = useLocation();
  const style = getTypeStyle(notification.type);
  const route = TYPE_ROUTE[notification.type];

  const handleTap = () => {
    if (!notification.read) onRead(notification.id);
    if (route) navigate(route);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      onClick={handleTap}
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
        notification.read
          ? "border-border/30 bg-card/40 opacity-70"
          : "border-border/60 bg-card shadow-sm"
      }`}
    >
      {/* Unread dot */}
      <div className="relative shrink-0 mt-0.5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg} ${style.text}`}
        >
          {style.icon}
        </div>
        {!notification.read && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold leading-tight ${
              notification.read ? "text-muted-foreground" : "text-white"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
            {relativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Navigate chevron */}
      {route && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-border/20 flex items-center justify-center">
        <BellOff className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-white font-medium mb-1">
          {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
        </p>
        <p className="text-muted-foreground text-sm">
          Activity will appear here as you play.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20;

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();
  const { data: unreadData } = useGetNotificationsUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  // ---------------------------------------------------------------------------
  // Fetch helpers
  // ---------------------------------------------------------------------------
  const fetchPage = useCallback(
    async (opts: { nextCursor?: number; replace: boolean; filter: FilterKey }) => {
      const params: GetNotificationsParams = {
        limit: PAGE_SIZE,
        ...(opts.filter !== "all" ? { type: opts.filter as NotifType } : {}),
        ...(opts.nextCursor !== undefined ? { cursor: opts.nextCursor } : {}),
      };

      const data = await getNotifications(params);

      if (opts.replace) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const fresh = data.notifications.filter((n) => !existingIds.has(n.id));
          return [...prev, ...fresh];
        });
      }

      setHasMore(data.hasMore);
      setCursor(data.nextCursor ?? undefined);
    },
    [],
  );

  const loadInitial = useCallback(
    async (filter: FilterKey) => {
      setIsLoading(true);
      setNotifications([]);
      setCursor(undefined);
      try {
        await fetchPage({ replace: true, filter });
      } catch {
        toast({ title: "Failed to load notifications", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPage, toast],
  );

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || cursor === undefined) return;
    setIsFetchingMore(true);
    try {
      await fetchPage({ nextCursor: cursor, replace: false, filter: activeFilter });
    } catch {
      /* silent */
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, cursor, fetchPage, activeFilter]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadInitial(activeFilter);
      queryClient.invalidateQueries({
        queryKey: getGetNotificationsUnreadCountQueryKey(),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadInitial, activeFilter, queryClient]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load on mount + filter change (guard: only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    loadInitial(activeFilter);
  }, [activeFilter, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isFetchingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  // Pull-to-refresh touch gestures
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    if (delta > 60 && !isRefreshing) handleRefresh();
    touchStartY.current = null;
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleMarkRead = useCallback(
    (id: number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      markReadMutation.mutate(
        { id },
        {
          onError: () => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
            );
          },
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getGetNotificationsUnreadCountQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetNotificationsQueryKey(),
            });
          },
        },
      );
    },
    [markReadMutation, queryClient],
  );

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllMutation.mutate(undefined, {
      onError: () => loadInitial(activeFilter),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsUnreadCountQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetNotificationsQueryKey(),
        });
        toast({ title: "All notifications marked as read" });
      },
    });
  }, [markAllMutation, queryClient, toast, loadInitial, activeFilter]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-white">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary text-black text-[11px] font-bold leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllMutation.isPending}
                title="Mark all as read"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-white bg-border/20 hover:bg-border/30 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>All read</span>
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-muted-foreground hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Your activity feed</p>
      </div>

      {/* Filter tabs */}
      <div className="px-5 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === f.key
                  ? "bg-primary text-black shadow"
                  : "bg-border/20 text-muted-foreground hover:text-white hover:bg-border/30"
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotifSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <NotifCard key={n.id} notification={n} onRead={handleMarkRead} />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* Load more indicator */}
        {isFetchingMore && (
          <div className="flex justify-center py-4">
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* End of feed */}
        {!isLoading && !hasMore && notifications.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            You're all caught up
          </p>
        )}
      </div>
    </div>
  );
}
