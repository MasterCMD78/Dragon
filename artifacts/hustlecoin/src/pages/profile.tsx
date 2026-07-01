import React from "react";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Loader2, Users, Calendar, Coins, Flame } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { data: profile, isLoading } = useGetUserProfile();

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-xl font-display font-bold mb-8 mt-4 text-center tracking-widest uppercase">Profile</h1>

      {/* Avatar & Info */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center overflow-hidden mb-4 relative shadow-[0_0_15px_rgba(255,170,0,0.15)]">
          <span className="text-3xl font-display font-bold text-primary">{profile?.firstName?.charAt(0) || 'U'}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-username">{profile?.username ? `@${profile.username}` : profile?.firstName}</h2>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium font-display" data-testid="text-referral-code">
          Ref: {profile?.referralCode}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
          <Coins className="w-6 h-6 text-primary mb-2" />
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Mined</span>
          <span className="text-xl font-display font-bold text-white" data-testid="text-total-mined">{profile?.totalMines?.toLocaleString() || '0'}</span>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
          <Flame className="w-6 h-6 text-orange-500 mb-2" />
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Best Streak</span>
          <span className="text-xl font-display font-bold text-white" data-testid="text-profile-streak">{profile?.streak || '0'}</span>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
          <Users className="w-6 h-6 text-blue-500 mb-2" />
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Referrals</span>
          <span className="text-xl font-display font-bold text-white" data-testid="text-referrals">{profile?.totalReferrals || '0'}</span>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/50 flex flex-col items-center text-center">
          <Calendar className="w-6 h-6 text-green-500 mb-2" />
          <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Joined</span>
          <span className="text-sm font-display font-bold text-white mt-1" data-testid="text-join-date">
            {profile?.joinDate ? format(new Date(profile.joinDate), 'MMM yyyy') : '---'}
          </span>
        </div>
      </div>

    </div>
  );
}
