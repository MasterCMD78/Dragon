import React, { useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Zap, Pickaxe, UserCheck, User } from "lucide-react";

const TARGETS = [
  { key: "everyone", label: "Everyone", icon: <Users className="w-4 h-4" />, desc: "All non-banned users" },
  { key: "active_today", label: "Active Today", icon: <Zap className="w-4 h-4" />, desc: "Users active in the last 24h" },
  { key: "top_miners", label: "Top 100 Miners", icon: <Pickaxe className="w-4 h-4" />, desc: "Users with the most total mines" },
  { key: "top_referrers", label: "Top 100 Referrers", icon: <UserCheck className="w-4 h-4" />, desc: "Users with the most referrals" },
  { key: "specific", label: "Specific User", icon: <User className="w-4 h-4" />, desc: "One user by Telegram ID" },
];

export function Broadcast() {
  const { toast } = useToast();
  const [target, setTarget] = useState("everyone");
  const [specificId, setSpecificId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number } | null>(null);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    if (target === "specific" && !specificId.trim()) {
      toast({ title: "Telegram ID is required for specific target", variant: "destructive" });
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      const res = await adminApi.broadcast({
        title: title.trim(),
        message: message.trim(),
        target,
        ...(target === "specific" ? { telegramId: specificId.trim() } : {}),
      });
      setLastResult({ sent: res.sent });
      toast({ title: `Notification sent to ${res.sent} user${res.sent !== 1 ? "s" : ""}` });
      setTitle("");
      setMessage("");
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-display font-bold text-white">Broadcast Notification</h2>

      {/* Target selector */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Target Audience</p>
        <div className="flex flex-col gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTarget(t.key)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                target === t.key
                  ? "border-primary bg-primary/10"
                  : "border-border/40 bg-card/40 hover:border-border/60"
              }`}
            >
              <div className={`${target === t.key ? "text-primary" : "text-muted-foreground"}`}>
                {t.icon}
              </div>
              <div>
                <p className={`text-sm font-semibold ${target === t.key ? "text-white" : "text-muted-foreground"}`}>
                  {t.label}
                </p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Specific user input */}
      {target === "specific" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Telegram ID</label>
          <input
            value={specificId}
            onChange={(e) => setSpecificId(e.target.value)}
            placeholder="e.g. 123456789"
            className="w-full bg-card border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
      )}

      {/* Compose */}
      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Message</p>
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full bg-card border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message…"
            rows={4}
            className="w-full bg-card border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50 resize-none"
          />
        </div>
      </div>

      {/* Preview */}
      {(title || message) && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">Preview</p>
          <p className="text-sm font-semibold text-white">{title || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message || "—"}</p>
        </div>
      )}

      {lastResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400 text-sm text-center">
          ✅ Sent to {lastResult.sent} user{lastResult.sent !== 1 ? "s" : ""}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-black font-display font-bold text-base shadow-[0_0_15px_rgba(255,170,0,0.2)] disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending…" : "Send Notification"}
      </button>
    </div>
  );
}
