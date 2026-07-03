import React from "react";
import { Link, useLocation } from "wouter";
import { Home, User as UserIcon, ExternalLink, Users, Trophy, ListChecks, Swords, Award, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useGetNotificationsUnreadCount } from "@workspace/api-client-react";

const DEV_BYPASS = import.meta.env.VITE_ALLOW_DEV_BYPASS === "true";

function buildTelegramLink(): string {
  const bot = __TELEGRAM_BOT_USERNAME__;
  return bot ? `https://t.me/${bot}` : "https://t.me";
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-black text-[8px] font-bold leading-none border border-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const { isLoading, isTelegramAvailable, isAuthenticated } = useAuth();
  const { data: unreadData } = useGetNotificationsUnreadCount({
    query: { refetchInterval: 30000, enabled: isAuthenticated },
  });
  const unreadCount = unreadData?.count ?? 0;

  if (!isTelegramAvailable) {
    const link = buildTelegramLink();
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50 gap-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="text-primary font-display text-4xl font-bold">HC</span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-display font-bold text-white" data-testid="text-open-telegram">
              Open in Telegram
            </h1>
            <p className="text-muted-foreground text-sm">
              After opening the bot, tap the{" "}
              <span className="text-white font-medium">Menu button</span>{" "}
              to launch HustleCoin.
            </p>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-open-telegram"
            className="flex items-center justify-center gap-2 w-full max-w-xs rounded-2xl py-4 px-6 bg-gradient-to-r from-primary to-orange-500 text-black font-display font-bold text-lg shadow-[0_0_20px_rgba(255,170,0,0.3)] hover:shadow-[0_0_30px_rgba(255,170,0,0.5)] transition-shadow"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  if (!DEV_BYPASS && (isLoading || !isAuthenticated)) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center border-x border-border/50">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse mb-8">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground font-display tracking-widest text-sm uppercase">CONNECTING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col relative border-x border-border/50 overflow-hidden">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-card border-t border-border/50 flex items-center justify-around px-2 z-50">
          <Link href="/" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-home">
              <Home className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/referrals" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/referrals' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-referrals">
              <Users className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/leaderboard" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/leaderboard' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-leaderboard">
              <Trophy className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/tasks" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/tasks' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-tasks">
              <ListChecks className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/quests" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/quests' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-quests">
              <Swords className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/achievements" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/achievements' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-achievements">
              <Award className="w-5 h-5" />
            </div>
          </Link>
          <Link href="/notifications" className="flex-1 flex justify-center">
            <div className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/notifications' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-notifications">
              <Bell className="w-5 h-5" />
              <UnreadBadge count={unreadCount} />
            </div>
          </Link>
          <Link href="/profile" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-profile">
              <UserIcon className="w-5 h-5" />
            </div>
          </Link>
        </div>
        
      </div>
    </div>
  );
};
