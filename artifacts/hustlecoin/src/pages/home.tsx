import React, { useState } from "react";
import { useGetUserStats } from "@workspace/api-client-react";
import { Flame, Trophy, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: stats, isLoading } = useGetUserStats();
  const [isMining, setIsMining] = useState(false);

  const handleMine = () => {
    if (!stats?.canMineNow || isMining) return;
    setIsMining(true);
    // In Phase 1 we just simulate the mining action since we don't have the hook requested, 
    // or rather, we were told to build the UI for it.
    setTimeout(() => {
      setIsMining(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col pt-12">
      {/* Top Bar Stats */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="font-display font-bold text-sm" data-testid="text-streak">{stats?.streak || 0}</span>
        </div>
        <div className="flex items-center gap-2 bg-card/80 px-4 py-2 rounded-full border border-border/50">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-display font-bold text-sm" data-testid="text-rank">#{stats?.globalRank || '---'}</span>
        </div>
      </div>

      {/* Center Balance */}
      <div className="flex-1 flex flex-col items-center justify-center mb-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="w-32 h-32 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center border-4 border-primary/30 shadow-[0_0_40px_rgba(255,170,0,0.3)] relative z-10">
            <span className="font-display text-5xl font-black text-black">HC</span>
          </div>
        </motion.div>
        
        <div className="text-center">
          <h2 className="text-muted-foreground text-sm tracking-widest font-display uppercase mb-2">Total Balance</h2>
          <div className="text-5xl font-display font-bold text-white tracking-tight" data-testid="text-balance">
            {stats?.balance?.toLocaleString() || '0'}
          </div>
        </div>
      </div>

      {/* Mine Button */}
      <div className="pb-8">
        <button
          onClick={handleMine}
          disabled={!stats?.canMineNow || isMining}
          className={`w-full relative group overflow-hidden rounded-2xl p-1 transition-all ${
            stats?.canMineNow 
              ? 'bg-gradient-to-r from-primary to-orange-500 cursor-pointer shadow-[0_0_20px_rgba(255,170,0,0.3)] hover:shadow-[0_0_30px_rgba(255,170,0,0.5)]' 
              : 'bg-muted cursor-not-allowed opacity-80'
          }`}
          data-testid="button-mine"
        >
          <div className="bg-background w-full h-full rounded-xl py-5 flex items-center justify-center gap-3 relative z-10 transition-colors group-hover:bg-background/90">
            {isMining ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <Zap className={`w-6 h-6 ${stats?.canMineNow ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-display font-bold text-lg tracking-wide ${stats?.canMineNow ? 'text-white' : 'text-muted-foreground'}`}>
                  {stats?.canMineNow ? 'MINE NOW' : 'COOLDOWN'}
                </span>
              </>
            )}
          </div>
          {stats?.canMineNow && (
            <div className="absolute inset-0 bg-white/20 blur-md group-hover:opacity-100 opacity-0 transition-opacity" />
          )}
        </button>
      </div>
    </div>
  );
}
