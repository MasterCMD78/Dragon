import React, { useState } from "react";
import { format } from "date-fns";
import {
  useGetReferralStats,
  useGetReferralUsers,
  useGetReferralRewards,
} from "@workspace/api-client-react";
import {
  Users,
  Gift,
  Copy,
  Check,
  Share2,
  Loader2,
  UserPlus,
  Coins,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function displayName(firstName: string, username: string): string {
  if (username) return `@${username}`;
  return firstName || "User";
}

export default function Referrals() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"users" | "rewards">("users");

  const { data: stats, isLoading: isStatsLoading } = useGetReferralStats();
  const { data: usersData, isLoading: isUsersLoading } = useGetReferralUsers({
    limit: 20,
    offset: 0,
  });
  const { data: rewardsData, isLoading: isRewardsLoading } =
    useGetReferralRewards({ limit: 20, offset: 0 });

  const referralLink = stats?.referralLink ?? "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const handleShare = () => {
    if (!referralLink) return;
    const text = encodeURIComponent("Join me on HustleCoin and earn HP!");
    const url = encodeURIComponent(referralLink);
    const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
    const webApp = window.Telegram?.WebApp;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div className="p-6 flex flex-col pt-8 space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold text-white">Referrals</h1>
        <p className="text-muted-foreground text-sm">Invite friends and earn 500 HP per referral</p>
      </div>

      {/* Stats Row */}
      {isStatsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 bg-card rounded-2xl border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              Referred
            </div>
            <div className="text-3xl font-display font-bold text-white" data-testid="stat-total-referred">
              {stats?.totalReferred ?? 0}
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5" />
              HP Earned
            </div>
            <div className="text-3xl font-display font-bold text-primary" data-testid="stat-total-hp">
              {(stats?.totalHpEarned ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Referral Link Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-display">Your Referral Link</p>
        <div className="flex items-center gap-2 bg-black/40 rounded-xl px-3 py-2 border border-white/5">
          <span
            className="flex-1 text-sm text-white/80 font-mono truncate"
            data-testid="referral-link"
          >
            {referralLink || "Loading…"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            data-testid="button-copy-link"
            className="flex items-center justify-center gap-2 rounded-xl py-3 bg-muted hover:bg-muted/80 transition-colors text-white text-sm font-medium"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-green-400" /> Copied</>
            ) : (
              <><Copy className="w-4 h-4" /> Copy Link</>
            )}
          </button>
          <button
            onClick={handleShare}
            data-testid="button-share"
            className="flex items-center justify-center gap-2 rounded-xl py-3 bg-gradient-to-r from-primary to-orange-500 text-black text-sm font-display font-bold shadow-[0_0_15px_rgba(255,170,0,0.3)] hover:shadow-[0_0_25px_rgba(255,170,0,0.5)] transition-shadow"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {/* Reward info banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-start gap-3">
        <Gift className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="text-white font-medium">You earn 500 HP</span>
          <span className="text-muted-foreground"> for each friend who joins. </span>
          <span className="text-white font-medium">They earn 250 HP</span>
          <span className="text-muted-foreground"> as a welcome bonus.</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
        <button
          onClick={() => setTab("users")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "users"
              ? "bg-card text-white shadow"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Friends ({stats?.totalReferred ?? 0})
        </button>
        <button
          onClick={() => setTab("rewards")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "rewards"
              ? "bg-card text-white shadow"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Gift className="w-4 h-4" />
          Rewards
        </button>
      </div>

      {/* Friends List */}
      {tab === "users" && (
        <div className="flex flex-col gap-3" data-testid="referred-users-list">
          {isUsersLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-xl border border-border/50 animate-pulse" />
            ))
          ) : usersData?.entries && usersData.entries.length > 0 ? (
            usersData.entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-display font-bold text-sm">
                      {(entry.firstName?.[0] ?? "U").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      {displayName(entry.firstName, entry.username)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Joined {format(new Date(entry.joinedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <span className="font-display font-bold text-primary text-sm">+{entry.hpEarned} HP</span>
              </div>
            ))
          ) : (
            <div className="bg-card border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-white">No referrals yet</p>
              <p className="text-xs text-muted-foreground">Share your link to invite friends!</p>
            </div>
          )}
        </div>
      )}

      {/* Rewards History */}
      {tab === "rewards" && (
        <div className="flex flex-col gap-3" data-testid="referral-rewards-list">
          {isRewardsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-card rounded-xl border border-border/50 animate-pulse" />
            ))
          ) : rewardsData?.entries && rewardsData.entries.length > 0 ? (
            rewardsData.entries.map((entry) => (
              <div key={entry.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      {displayName(entry.firstName, entry.username)} joined
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.earnedAt), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                </div>
                <span className="font-display font-bold text-yellow-400 text-sm">+{entry.hpEarned} HP</span>
              </div>
            ))
          ) : (
            <div className="bg-card border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
              <Gift className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-white">No rewards yet</p>
              <p className="text-xs text-muted-foreground">Invite friends to start earning HP!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
