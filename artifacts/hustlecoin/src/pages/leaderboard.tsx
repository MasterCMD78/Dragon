import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetLeaderboardGlobal,
  useGetLeaderboardMining,
  useGetLeaderboardReferrals,
  useGetLeaderboardMe,
  type LeaderboardMyRank,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Pickaxe, Users, Flame, Coins, Gift, RefreshCw } from "lucide-react";

type TabKey = "global" | "mining" | "referrals";

const TABS: { key: TabKey; label: string; emoji: string; icon: React.ElementType }[] = [
  { key: "global", label: "Global", emoji: "🌍", icon: Globe },
  { key: "mining", label: "Mining", emoji: "⛏", icon: Pickaxe },
  { key: "referrals", label: "Referrals", emoji: "👥", icon: Users },
];

function displayName(firstName?: string, username?: string): string {
  if (username) return `@${username}`;
  return firstName || "User";
}

function medal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function rankStyle(rank: number): string {
  if (rank === 1) return "border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.15)]";
  if (rank === 2) return "border-slate-300/50 bg-slate-300/5";
  if (rank === 3) return "border-amber-600/50 bg-amber-600/5";
  return "border-border/50 bg-card";
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

function Avatar({ label, rank }: { label: string; rank: number }) {
  const m = medal(rank);
  return (
    <div className="relative shrink-0">
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary font-display font-bold text-sm">
          {label.replace(/^@/, "").charAt(0).toUpperCase() || "U"}
        </span>
      </div>
      {m && (
        <span className="absolute -bottom-1 -right-1 text-sm leading-none">{m}</span>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const m = medal(rank);
  return (
    <div className="w-8 flex items-center justify-center shrink-0">
      {m ? (
        <span className="text-xl">{m}</span>
      ) : (
        <span className="text-sm font-display font-bold text-muted-foreground">#{rank}</span>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("global");
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const globalQuery = useGetLeaderboardGlobal({ limit: 100, offset: 0 });
  const miningQuery = useGetLeaderboardMining({ limit: 100, offset: 0 });
  const referralsQuery = useGetLeaderboardReferrals({ limit: 100, offset: 0 });
  const meQuery = useGetLeaderboardMe();

  const activeQuery =
    tab === "global" ? globalQuery : tab === "mining" ? miningQuery : referralsQuery;

  const isLoading = activeQuery.isLoading;
  const entries = activeQuery.data?.entries ?? [];

  const refetchAll = useCallback(async () => {
    await Promise.all([
      globalQuery.refetch(),
      miningQuery.refetch(),
      referralsQuery.refetch(),
      meQuery.refetch(),
    ]);
  }, [globalQuery, miningQuery, referralsQuery, meQuery]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || pulling) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && scrollRef.current && scrollRef.current.scrollTop <= 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !pulling) {
      setPulling(true);
      setPullDistance(60);
      await refetchAll();
      setPulling(false);
    }
    setPullDistance(0);
    touchStartY.current = null;
  };

  const isMe = (telegramId: string) => telegramId === user?.telegramId;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-3 flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold text-white">Leaderboards</h1>
        <p className="text-muted-foreground text-sm">See how you stack up against the community</p>
      </div>

      {/* Tabs */}
      <div className="px-6 pb-4">
        <div className="flex gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
          {TABS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`tab-${key}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-card text-white shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list with pull-to-refresh */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-4 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: pullDistance }}
        >
          <RefreshCw
            className={`w-5 h-5 text-primary ${pulling ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${pullDistance * 4}deg)`, opacity: pullDistance / 60 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
            data-testid={`list-${tab}`}
          >
            {isLoading ? (
              Array(8)
                .fill(0)
                .map((_, i) => <RowSkeleton key={i} />)
            ) : entries.length === 0 ? (
              <div className="bg-card border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                <Users className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-white">No rankings yet</p>
                <p className="text-xs text-muted-foreground">Be the first to make the board!</p>
              </div>
            ) : (
              entries.map((entry, i) => {
                const mine = isMe(entry.telegramId);
                return (
                  <motion.div
                    key={entry.telegramId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
                    data-testid={`row-${tab}-${entry.rank}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${rankStyle(
                      entry.rank,
                    )} ${mine ? "ring-2 ring-primary/70" : ""}`}
                  >
                    <RankBadge rank={entry.rank} />
                    <Avatar label={displayName(entry.firstName, entry.username)} rank={entry.rank} />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                        {displayName(entry.firstName, entry.username)}
                        {mine && (
                          <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                            You
                          </span>
                        )}
                      </span>
                      {tab === "global" && "level" in entry && (
                        <span className="text-xs text-muted-foreground">Level {entry.level}</span>
                      )}
                      {tab === "mining" && "streak" in entry && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" /> Streak {entry.streak}
                        </span>
                      )}
                      {tab === "referrals" && "totalReferrals" in entry && (
                        <span className="text-xs text-muted-foreground">
                          {entry.totalReferrals} referrals
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {tab === "global" && "balance" in entry && (
                        <span className="font-display font-bold text-primary text-sm flex items-center gap-1 justify-end">
                          <Coins className="w-3.5 h-3.5" /> {entry.balance.toLocaleString()}
                        </span>
                      )}
                      {tab === "mining" && "totalMines" in entry && (
                        <span className="font-display font-bold text-white text-sm">
                          {entry.totalMines.toLocaleString()} mines
                        </span>
                      )}
                      {tab === "referrals" && "totalReferralHp" in entry && (
                        <span className="font-display font-bold text-yellow-400 text-sm flex items-center gap-1 justify-end">
                          <Gift className="w-3.5 h-3.5" /> {entry.totalReferralHp.toLocaleString()} HP
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* My Rank pinned footer — only shown when outside the visible top list */}
      <MyRankFooter
        tab={tab}
        entries={entries}
        me={meQuery.data}
        isMeLoading={meQuery.isLoading}
        userTelegramId={user?.telegramId}
      />
    </div>
  );
}

function MyRankFooter({
  tab,
  entries,
  me,
  isMeLoading,
  userTelegramId,
}: {
  tab: TabKey;
  entries: Array<{ telegramId: string }>;
  me: LeaderboardMyRank | undefined;
  isMeLoading: boolean;
  userTelegramId?: string;
}) {
  const alreadyVisible = userTelegramId
    ? entries.some((e) => e.telegramId === userTelegramId)
    : false;

  if (alreadyVisible) return null;
  if (isMeLoading) {
    return (
      <div className="mx-6 mb-6 p-3 rounded-xl border border-primary/30 bg-primary/5">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (!me) return null;

  const rank = tab === "global" ? me.globalRank : tab === "mining" ? me.miningRank : me.referralRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 mb-6 p-3 rounded-xl border border-primary/40 bg-primary/5 flex items-center gap-3"
      data-testid="my-rank-footer"
    >
      <div className="w-8 flex items-center justify-center shrink-0">
        <span className="text-sm font-display font-bold text-primary">#{rank}</span>
      </div>
      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <span className="text-primary font-display font-bold text-sm">Y</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm font-medium text-white">Your Rank</span>
        <span className="text-xs text-muted-foreground">
          {tab === "global" && `Balance ${me.balance.toLocaleString()} HP`}
          {tab === "mining" && `${me.totalMines.toLocaleString()} mines · streak ${me.streak}`}
          {tab === "referrals" && `${me.totalReferrals} referrals`}
        </span>
      </div>
      <div className="text-right shrink-0 font-display font-bold text-primary text-sm">
        {tab === "global" && `${me.balance.toLocaleString()} HP`}
        {tab === "mining" && `${me.totalMines.toLocaleString()} mines`}
        {tab === "referrals" && `${me.totalReferralHp.toLocaleString()} HP`}
      </div>
    </motion.div>
  );
}
