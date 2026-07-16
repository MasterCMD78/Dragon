import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  useGetMiningStatus, 
  useGetMiningHistory, 
  useStartMining, 
  useClaimMining,
  getGetMiningStatusQueryKey,
  getGetMiningHistoryQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Zap, Flame, Clock, History, Check, ShieldCheck, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

function formatCountdown(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Home() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: status, isLoading: isStatusLoading } = useGetMiningStatus({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: {
      // Re-fetch every 30 s so the UI transitions to "claimable" automatically
      // when a session completes, and users returning from background get fresh
      // state without a manual refresh.
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
    } as any,
  });
  const { data: history, isLoading: isHistoryLoading } = useGetMiningHistory({ limit: 5, offset: 0 });
  
  const startMining = useStartMining();
  const claimMining = useClaimMining();

  const [countdown, setCountdown] = useState(0);
  const [showSplash, setShowSplash] = useState(false);
  const [splashReward, setSplashReward] = useState(0);

  useEffect(() => {
    if (status?.state === "mining" && status.sessionStartedAt) {
      // Compute remaining seconds from sessionStartedAt on every tick so the
      // countdown stays accurate even when JS is suspended (mobile backgrounding).
      // This replaces the stale-decrement approach that drifted after app resumes.
      const SESSION_MS = 24 * 60 * 60 * 1000;
      const endsAt = new Date(new Date(status.sessionStartedAt).getTime() + SESSION_MS);

      // Declare interval before tick() so clearInterval never hits TDZ.
      let interval: ReturnType<typeof setInterval> | undefined;

      const tick = () => {
        const remaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          if (interval !== undefined) clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
        }
      };

      tick(); // set immediately so UI doesn't show 0 for the first second
      interval = setInterval(tick, 1000);
      return () => { if (interval !== undefined) clearInterval(interval); };
    }
    if (status?.state !== "mining") {
      setCountdown(0);
    }
    return undefined;
  }, [status?.sessionStartedAt, status?.state, queryClient]);

  const handleStartMining = () => {
    if (status?.state !== "idle" || startMining.isPending) return;
    
    startMining.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
        toast({
          title: "Mining Session Started",
          description: "Your 24-hour mining session has begun.",
        });
      },
      onError: (error: unknown) => {
        // ApiError wraps the response; the body is in .data.  Plain Error has .message.
        type ApiLike = { data?: { error?: string }; message?: string };
        const e = error as ApiLike;
        const msg = e?.data?.error ?? e?.message ?? "An unexpected error occurred";
        toast({ title: "Failed to start mining", description: msg, variant: "destructive" });
      }
    });
  };

  const handleClaimRewards = () => {
    if (status?.state !== "claimable" || claimMining.isPending) return;
    
    claimMining.mutate(undefined, {
      onSuccess: (result) => {
        setSplashReward(result.totalReward);
        setShowSplash(true);
        
        queryClient.invalidateQueries({ queryKey: getGetMiningStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMiningHistoryQueryKey() });
        
        setTimeout(() => {
          setShowSplash(false);
        }, 3000);
      },
      onError: (error: unknown) => {
        type ApiLike = { data?: { error?: string }; message?: string };
        const e = error as ApiLike;
        const msg = e?.data?.error ?? e?.message ?? "An unexpected error occurred";
        toast({ title: "Failed to claim rewards", description: msg, variant: "destructive" });
      }
    });
  };

  const DEV_BYPASS = import.meta.env.VITE_ALLOW_DEV_BYPASS === "true";
  const devState = DEV_BYPASS ? new URLSearchParams(window.location.search).get("dev_state") : null;

  if (!devState && isStatusLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse mb-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <p className="text-muted-foreground font-display tracking-widest text-sm uppercase">LOADING</p>
      </div>
    );
  }

  const isMining = devState === "mining" || status?.state === "mining";
  const isClaimable = devState === "claimable" || status?.state === "claimable";
  const isIdle = !isMining && !isClaimable && (devState === "idle" || status?.state === "idle" || (!devState && !status?.state));

  return (
    <div className="p-6 flex flex-col pt-8 space-y-8 relative">
      
      {/* Reward Splash Overlay */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div 
                initial={{ rotate: -45 }}
                animate={{ rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center border-4 border-yellow-300 shadow-[0_0_80px_rgba(255,170,0,0.6)] mb-6"
              >
                <Check className="w-16 h-16 text-black" strokeWidth={3} />
              </motion.div>
              <h2 className="text-3xl font-display font-bold text-white mb-2">Rewards Claimed!</h2>
              <div className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 shadow-sm drop-shadow-lg">
                +{splashReward.toLocaleString()} HP
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="font-display font-bold text-sm" data-testid="text-streak">{status?.streak || 0}</span>
        </div>
        <div className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50">
          <History className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-sm">Mines: {status?.totalMines || 0}</span>
        </div>
      </div>

      {/* Center Balance */}
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-muted-foreground text-xs tracking-widest font-display uppercase mb-2">Total Balance</h2>
        <div className="text-5xl font-display font-bold text-white tracking-tight" data-testid="text-balance">
          {(status?.balance ?? user?.balance ?? 0).toLocaleString()} <span className="text-primary text-3xl">HP</span>
        </div>
      </div>

      {/* Main Mining Card */}
      <div className="w-full relative bg-card border border-border/50 rounded-3xl p-6 flex flex-col items-center shadow-lg overflow-hidden flex-shrink-0">
        {/* Glow Effects */}
        {isMining && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
        )}
        {isClaimable && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/20 blur-[80px] rounded-full pointer-events-none" />
        )}

        {/* Status Indicator */}
        <div 
          className="flex items-center gap-2 mb-8 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md relative z-10"
          data-testid="mining-state"
        >
          {isMining && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider font-display">Mining in Progress</span>
            </>
          )}
          {isClaimable && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider font-display">Ready to Claim!</span>
            </>
          )}
          {isIdle && (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-display">Idle</span>
            </>
          )}
        </div>

        {/* The Coin */}
        <motion.div 
          animate={
            isMining ? { rotateY: 360 } : 
            isClaimable ? { scale: [1, 1.05, 1], filter: ["drop-shadow(0 0 20px rgba(255,170,0,0.5))", "drop-shadow(0 0 40px rgba(255,200,0,0.8))", "drop-shadow(0 0 20px rgba(255,170,0,0.5))"] } : 
            {}
          }
          transition={
            isMining ? { repeat: Infinity, duration: 4, ease: "linear" } : 
            isClaimable ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : 
            {}
          }
          className="relative mb-8 z-10 perspective-[1000px] transform-style-3d"
        >
          <div className={`w-40 h-40 rounded-full flex items-center justify-center border-[6px] relative ${
            isClaimable ? 'bg-gradient-to-br from-yellow-300 via-orange-500 to-red-600 border-yellow-200' :
            isMining ? 'bg-gradient-to-br from-primary via-orange-600 to-primary border-primary/50' : 
            'bg-muted border-muted-foreground/30'
          }`}>
            <span className={`font-display text-6xl font-black ${isIdle ? 'text-muted-foreground/50' : 'text-black'}`}>HC</span>
            {/* Inner ring for 3D effect */}
            <div className="absolute inset-2 rounded-full border border-white/20" />
            <div className="absolute inset-4 rounded-full border border-white/10" />
          </div>
        </motion.div>

        {/* Timer / Info */}
        <div className="text-center mb-8 relative z-10">
          {(isMining || isClaimable) ? (
            <div className="text-4xl font-display font-bold text-white tracking-widest tabular-nums" data-testid="countdown-timer">
              {isClaimable ? "READY TO CLAIM" : formatCountdown(countdown)}
            </div>
          ) : (
            <div className="text-2xl font-display font-medium text-muted-foreground" data-testid="countdown-timer">
              READY TO MINE
            </div>
          )}
        </div>

        {/* Session Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mb-8 relative z-10">
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mining Rate</span>
            <span className="font-display font-bold text-primary" data-testid="text-mining-rate">
              {status?.miningRate || 0} HP/hr
            </span>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Est. Reward</span>
            <span className="font-display font-bold text-primary" data-testid="text-estimated-reward">
              {status?.estimatedReward || 0} HP
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full relative z-10">
          {isIdle && (
            <button
              onClick={handleStartMining}
              disabled={startMining.isPending}
              className="w-full relative group overflow-hidden rounded-2xl p-1 transition-all bg-gradient-to-r from-primary to-orange-500 shadow-[0_0_20px_rgba(255,170,0,0.3)] hover:shadow-[0_0_30px_rgba(255,170,0,0.5)] cursor-pointer"
              data-testid="button-start-mining"
            >
              <div className="bg-background w-full h-full rounded-xl py-4 flex items-center justify-center gap-3 relative z-10 transition-colors group-hover:bg-background/90">
                {startMining.isPending ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6 text-primary animate-pulse" />
                    <span className="font-display font-bold text-lg tracking-wide text-white">
                      START MINING
                    </span>
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-white/20 blur-md group-hover:opacity-100 opacity-0 transition-opacity" />
            </button>
          )}

          {isMining && (
            <button
              disabled
              className="w-full relative overflow-hidden rounded-2xl p-1 transition-all bg-muted opacity-80 cursor-not-allowed"
            >
              <div className="bg-background w-full h-full rounded-xl py-4 flex items-center justify-center gap-3 relative z-10">
                <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                <span className="font-display font-bold text-lg tracking-wide text-muted-foreground">
                  MINING...
                </span>
              </div>
            </button>
          )}

          {isClaimable && (
            <button
              onClick={handleClaimRewards}
              disabled={claimMining.isPending}
              className="w-full relative group overflow-hidden rounded-2xl p-1 transition-all bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-[0_0_30px_rgba(255,170,0,0.6)] hover:shadow-[0_0_40px_rgba(255,200,0,0.8)] cursor-pointer animate-pulse"
              data-testid="button-claim-rewards"
            >
              <div className="bg-background/80 w-full h-full rounded-xl py-4 flex items-center justify-center gap-3 relative z-10 transition-colors group-hover:bg-background/60">
                {claimMining.isPending ? (
                  <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6 text-yellow-400" />
                    <span className="font-display font-bold text-xl tracking-wide text-yellow-400 drop-shadow-sm">
                      CLAIM REWARDS
                    </span>
                  </>
                )}
              </div>
            </button>
          )}
        </div>
        
        {/* Last Claimed Info */}
        {isIdle && status?.lastClaimedAt && (
          <div className="mt-4 text-xs text-muted-foreground text-center flex items-center gap-1.5 justify-center opacity-70">
            <Clock className="w-3 h-3" />
            Last claimed: {format(new Date(status.lastClaimedAt), "MMM d, h:mm a")}
          </div>
        )}
      </div>

      {/* Mining History Section */}
      <div className="flex flex-col gap-4 pb-8 relative z-10">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Mining History
        </h3>
        
        <div className="flex flex-col gap-3" data-testid="mining-history-list">
          {isHistoryLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="w-full h-16 bg-card rounded-xl border border-border/50 animate-pulse" />
            ))
          ) : history?.entries && history.entries.length > 0 ? (
            history.entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between hover:bg-card/80 transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-white">{format(new Date(entry.minedAt), "MMM d, yyyy")}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{format(new Date(entry.minedAt), "h:mm a")}</span>
                    {entry.streak > 1 && (
                      <span className="text-orange-400 flex items-center gap-0.5 bg-orange-400/10 px-1.5 py-0.5 rounded text-[10px]">
                        <Flame className="w-3 h-3" /> Day {entry.streak}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-display font-bold text-primary">+{entry.totalHp} HP</span>
                  {entry.bonusHp > 0 && (
                    <span className="text-[10px] text-yellow-500">includes {entry.bonusHp} bonus</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
              <Clock className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-white">No mining history yet</p>
              <p className="text-xs text-muted-foreground">Start your first mining session to earn HP!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
