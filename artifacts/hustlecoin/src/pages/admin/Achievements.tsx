import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type Achievement, type AchievementUnlock } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Users, Trash2, X } from "lucide-react";

function AchievementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Achievement>;
  onSave: (data: Partial<Achievement>) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Partial<Achievement>>({
    title: "",
    description: "",
    icon: "🏆",
    ...initial,
  });

  const set = (k: keyof Achievement, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-3">
      <div className="w-full max-w-[420px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-white font-semibold">{initial?.id ? "Edit Achievement" : "Create Achievement"}</h3>
        {(
          [
            ["Icon (emoji)", "icon"],
            ["Title", "title"],
            ["Description", "description"],
          ] as const
        ).map(([label, key]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input
              value={String(data[key as keyof Achievement] ?? "")}
              onChange={(e) => set(key as keyof Achievement, e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold">
            Cancel
          </button>
          <button onClick={() => onSave(data)} className="flex-1 py-3 rounded-xl bg-primary text-black text-sm font-semibold">
            {initial?.id ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnlocksPanel({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceInput, setForceInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getAchievementUnlocks(achievement.id)
      .then((r) => setUnlocks(r.unlocks))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [achievement.id, toast]);

  useEffect(() => { load(); }, [load]);

  const forceUnlock = async () => {
    if (!forceInput.trim()) return;
    try {
      await adminApi.forceUnlock(achievement.id, forceInput.trim());
      toast({ title: "Achievement force-unlocked" });
      setForceInput("");
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const removeUnlock = async (telegramId: string) => {
    if (!confirm("Remove this unlock?")) return;
    try {
      await adminApi.removeUnlock(achievement.id, telegramId);
      toast({ title: "Unlock removed" });
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-3">
      <div className="w-full max-w-[420px] bg-card border border-border/60 rounded-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <p className="text-white font-semibold text-sm">{achievement.icon} {achievement.title}</p>
            <p className="text-muted-foreground text-xs">{unlocks.length} unlocks</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Force unlock */}
        <div className="flex gap-2 p-3 border-b border-border/20">
          <input
            value={forceInput}
            onChange={(e) => setForceInput(e.target.value)}
            placeholder="Telegram ID to force-unlock"
            className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-primary/50"
          />
          <button
            onClick={forceUnlock}
            className="px-3 py-2 rounded-xl bg-primary text-black text-xs font-bold"
          >
            Grant
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)
          ) : unlocks.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No unlocks yet</p>
          ) : (
            unlocks.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{u.firstName}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.username ? `@${u.username}` : u.telegramId} · {new Date(u.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => removeUnlock(u.telegramId)}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function Achievements() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Achievement> | null>(null);
  const [viewUnlocks, setViewUnlocks] = useState<Achievement | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getAchievements()
      .then((r) => setAchievements(r.achievements))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Achievement>) => {
    try {
      if (data.id) {
        await adminApi.updateAchievement(data.id, data);
        toast({ title: "Achievement updated" });
      } else {
        await adminApi.createAchievement(data);
        toast({ title: "Achievement created" });
      }
      setForm(null);
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-white">Achievements</h2>
        <button
          onClick={() => setForm({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-black text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {achievements.map((a) => (
            <div key={a.id} className="rounded-xl border border-border/40 bg-card/60 p-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.totalUnlocks} unlocks</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setViewUnlocks(a)} className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setForm(a)} className="p-1.5 rounded-lg bg-border/20 text-muted-foreground hover:text-white">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <AchievementForm initial={form} onSave={save} onCancel={() => setForm(null)} />}
      {viewUnlocks && <UnlocksPanel achievement={viewUnlocks} onClose={() => setViewUnlocks(null)} />}
    </div>
  );
}
