import React from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  User as UserIcon,
  ExternalLink,
  Users,
  Trophy,
  ListChecks,
  Swords,
  Award,
  Bell,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw } from "lucide-react";
import { useGetNotificationsUnreadCount } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

function buildTelegramLink(): string {
  const bot = __TELEGRAM_BOT_USERNAME__;
  return bot ? `https://t.me/${bot}` : "https://t.me";
}

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  testId?: string;
}

function NavItem({ href, icon: Icon, isActive, badge = 0, testId }: NavItemProps) {
  return (
    <Link href={href} className="flex-1 flex justify-center">
      <div
        className={`relative flex flex-col items-center justify-center gap-[3px] w-full h-full select-none transition-colors duration-150 ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`}
        data-testid={testId}
      >
        <motion.div
          animate={{ scale: isActive ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>

        {/* Unread badge */}
        {badge > 0 && (
          <span className="absolute top-1 right-[12%] flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-black text-[8px] font-bold leading-none border border-background">
            {badge > 9 ? "9+" : badge}
          </span>
        )}

        {/* Active underline pip */}
        <div
          className={`h-0.5 rounded-full transition-all duration-200 ${
            isActive ? "w-4 bg-primary opacity-100" : "w-0 opacity-0"
          }`}
        />
      </div>
    </Link>
  );
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const { isLoading, isTelegramAvailable, isAuthenticated, authFailed, retryAuth } = useAuth();
  const { data: unreadData } = useGetNotificationsUnreadCount({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { refetchInterval: 30000, enabled: isAuthenticated } as any,
  });
  const unreadCount = unreadData?.count ?? 0;

  if (!isTelegramAvailable) {
    const link = buildTelegramLink();
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center"
          >
            <span className="text-primary font-display text-4xl font-bold">HC</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-display font-bold text-white" data-testid="text-open-telegram">
              Open in Telegram
            </h1>
            <p className="text-muted-foreground text-sm">
              After opening the bot, tap the{" "}
              <span className="text-white font-medium">Menu button</span>{" "}
              to launch HustleCoin.
            </p>
          </motion.div>
          <motion.a
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.97 }}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-open-telegram"
            className="flex items-center justify-center gap-2 w-full max-w-xs rounded-2xl py-4 px-6 bg-gradient-to-r from-primary to-orange-500 text-black font-display font-bold text-lg shadow-[0_0_20px_rgba(255,170,0,0.3)] hover:shadow-[0_0_30px_rgba(255,170,0,0.5)] transition-shadow"
          >
            <ExternalLink className="w-5 h-5" />
            Open in Telegram
          </motion.a>
        </div>
      </div>
    );
  }

  // Authentication could not complete after retries — never leave the user
  // staring at an infinite spinner; offer an explicit way to try again.
  if (authFailed) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center"
          >
            <span className="text-destructive font-display text-4xl font-bold">!</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-display font-bold text-white" data-testid="text-auth-error">
              Connection Failed
            </h1>
            <p className="text-muted-foreground text-sm">
              We couldn't verify your Telegram session. Check your connection and try again.
            </p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void retryAuth()}
            data-testid="button-retry-auth"
            className="flex items-center justify-center gap-2 w-full max-w-xs rounded-2xl py-4 px-6 bg-gradient-to-r from-primary to-orange-500 text-black font-display font-bold text-lg shadow-[0_0_20px_rgba(255,170,0,0.3)] hover:shadow-[0_0_30px_rgba(255,170,0,0.5)] transition-shadow"
          >
            <RefreshCw className="w-5 h-5" />
            Retry
          </motion.button>
        </div>
      </div>
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center border-x border-border/50">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </motion.div>
          <p className="text-muted-foreground font-display tracking-widest text-sm uppercase">CONNECTING</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col relative border-x border-border/50 overflow-hidden">

        {/* Page content with transition */}
        <main className="flex-1 overflow-y-auto pb-20 scrollbar-hide">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t border-border/50 flex items-center justify-around px-1 z-50">
          <NavItem href="/" icon={Home} isActive={location === "/"} testId="link-home" />
          <NavItem href="/referrals" icon={Users} isActive={location === "/referrals"} testId="link-referrals" />
          <NavItem href="/leaderboard" icon={Trophy} isActive={location === "/leaderboard"} testId="link-leaderboard" />
          <NavItem href="/tasks" icon={ListChecks} isActive={location === "/tasks"} testId="link-tasks" />
          <NavItem href="/quests" icon={Swords} isActive={location === "/quests"} testId="link-quests" />
          <NavItem href="/achievements" icon={Award} isActive={location === "/achievements"} testId="link-achievements" />
          <NavItem href="/notifications" icon={Bell} isActive={location === "/notifications"} badge={unreadCount} testId="link-notifications" />
          <NavItem href="/wallet" icon={Wallet} isActive={location === "/wallet"} testId="link-wallet" />
          <NavItem href="/profile" icon={UserIcon} isActive={location === "/profile"} testId="link-profile" />
        </div>

      </div>
    </div>
  );
};
