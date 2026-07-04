import React from "react";
import { useGetUserProfile } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, Coins, Flame, ShieldCheck, Pickaxe } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function StatCard({
  icon,
  label,
  value,
  color,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center gap-1 hover:border-border/80 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${color}`}>
        {icon}
      </div>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-display">{label}</span>
      <span className="text-xl font-display font-bold text-white">{value}</span>
    </motion.div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 pt-8">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { data: profile, isLoading } = useGetUserProfile();
  const { user } = useAuth();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const displayName = fullName
    || (profile?.username && profile.username !== "user" ? `@${profile.username}` : null)
    || (profile?.telegramId ? String(profile.telegramId) : "—");
  const initial = (fullName || profile?.username || profile?.telegramId?.toString() || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="p-6 flex flex-col pb-8">

      {/* Avatar & Identity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col items-center mt-6 mb-8"
      >
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-orange-500/20 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(255,170,0,0.15)]">
            <span className="text-3xl font-display font-bold text-primary">{initial}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-border/50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-username">
          {displayName}
        </h2>

        <div className="flex items-center gap-2">
          <div
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium font-display border border-primary/20"
            data-testid="text-referral-code"
          >
            Ref: {profile?.referralCode}
          </div>
        </div>
      </motion.div>

      {/* Balance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6 bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground font-display uppercase tracking-wider">Balance</span>
        </div>
        <span className="text-2xl font-display font-bold text-primary">
          {(user?.balance ?? 0).toLocaleString()} HP
        </span>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          index={0}
          icon={<Pickaxe className="w-5 h-5 text-primary" />}
          label="Total Mines"
          value={(profile?.totalMines ?? 0).toLocaleString()}
          color="bg-primary/15"
          data-testid="text-total-mined"
        />
        <StatCard
          index={1}
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Best Streak"
          value={String(profile?.streak ?? 0)}
          color="bg-orange-500/15"
          data-testid="text-profile-streak"
        />
        <StatCard
          index={2}
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Referrals"
          value={String(profile?.totalReferrals ?? 0)}
          color="bg-blue-500/15"
          data-testid="text-referrals"
        />
        <StatCard
          index={3}
          icon={<Calendar className="w-5 h-5 text-green-400" />}
          label="Joined"
          value={profile?.joinDate ? format(new Date(profile.joinDate), "MMM yyyy") : "---"}
          color="bg-emerald-500/15"
          data-testid="text-join-date"
        />
      </div>

      {/* Admin Panel Entry */}
      {user?.isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Link href="/admin">
            <button
              className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 px-6 bg-primary/10 border border-primary/30 hover:bg-primary/20 active:scale-[0.98] transition-all"
              data-testid="button-admin-panel"
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-primary tracking-wide">ADMIN PANEL</span>
            </button>
          </Link>
        </motion.div>
      )}

    </div>
  );
}
