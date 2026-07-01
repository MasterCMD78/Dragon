import React from "react";
import { Link, useLocation } from "wouter";
import { Home, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location] = useLocation();
  const { isLoading, isTelegramAvailable, isAuthenticated } = useAuth();

  if (!isTelegramAvailable) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="w-full max-w-[430px] h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center border-x border-border/50">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-primary font-display text-4xl font-bold">HC</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2" data-testid="text-open-telegram">Open in Telegram</h1>
          <p className="text-muted-foreground">This app is designed to be played inside Telegram.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !isAuthenticated) {
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
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-card border-t border-border/50 flex items-center justify-around px-6 z-50">
          <Link href="/" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-home">
              <Home className="w-6 h-6 mb-1" />
            </div>
          </Link>
          <Link href="/profile" className="flex-1 flex justify-center">
            <div className={`flex flex-col items-center justify-center w-full h-full transition-colors ${location === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`} data-testid="link-profile">
              <UserIcon className="w-6 h-6 mb-1" />
            </div>
          </Link>
        </div>
        
      </div>
    </div>
  );
};
