import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldOff, RefreshCw, MessageCircle, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SUPPORT_USERNAME = __TELEGRAM_BOT_USERNAME__ || "";

function getSupportUrl(): string {
  if (SUPPORT_USERNAME) return `https://t.me/${SUPPORT_USERNAME}`;
  return "https://t.me/";
}

export default function BannedScreen() {
  const { retryAuth } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await retryAuth();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1500);
    }
  };

  const handleAppeal = () => {
    window.open(getSupportUrl(), "_blank");
  };

  const handleSupport = () => {
    window.open(getSupportUrl(), "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.15)]"
        >
          <ShieldOff className="w-11 h-11 text-red-400" />
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-2xl font-display font-bold text-white">
            Account Suspended
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Your HustleCoin account has been suspended.
            If you believe this was a mistake, you may submit an appeal.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="w-full h-px bg-border/50"
        />

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="w-full flex flex-col gap-3"
        >
          {/* Primary — Appeal */}
          <button
            onClick={handleAppeal}
            className="w-full flex items-center justify-center gap-2.5 bg-primary text-primary-foreground rounded-2xl py-3.5 px-5 font-display font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(255,170,0,0.25)]"
          >
            <FileText className="w-4 h-4" />
            Appeal Ban
          </button>

          {/* Secondary — Contact Support */}
          <button
            onClick={handleSupport}
            className="w-full flex items-center justify-center gap-2.5 bg-card border border-border/60 text-white rounded-2xl py-3.5 px-5 font-display font-semibold text-sm hover:bg-card/80 active:scale-[0.98] transition-all duration-150"
          >
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            Contact Support
          </button>

          {/* Tertiary — Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2.5 bg-transparent border border-border/40 text-muted-foreground rounded-2xl py-3 px-5 font-display font-medium text-sm hover:border-border/70 hover:text-white active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Checking…" : "Refresh Status"}
          </button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-[11px] text-muted-foreground/50 text-center"
        >
          HustleCoin · Account moderation
        </motion.p>
      </motion.div>
    </div>
  );
}
