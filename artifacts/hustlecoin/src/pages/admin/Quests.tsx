import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type Quest } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

const QUEST_TYPES = ["mine", "referral", "task", "streak", "daily_mine", "daily_task"];

function QuestForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Quest>;
  onSave: (data: Partial<Quest>) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Partial<Quest>>({
    title: "",
    description: "",
    reward: 10,
    questType: "mine",
    target: 1,
    ...initial,
  });

  const set = (k: keyof Quest, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-3">
      <div className="w-full max-w-[420px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-white font-semibold">{initial?.id ? "Edit Quest" : "Create Quest"}</h3>
        {(
          [
            ["Title", "title", "text"],
            ["Description", "description", "text"],
          ] as const
        ).map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input
              type={type}
              value={String(data[key as keyof Quest] ?? "")}
              onChange={(e) => set(key as keyof Quest, e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
        ))}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Quest Type</label>
            <select
              value={data.questType}
              onChange={(e) => set("questType", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
            >
              {QUEST_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Target</label>
            <input
              type="number"
              value={data.target ?? 1}
              onChange={(e) => set("target", parseInt(e.target.value, 10))}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Reward (HP)</label>
            <input
              type="number"
              value={data.reward ?? 10}
              onChange={(e) => set("reward", parseInt(e.target.value, 10))}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>
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

export function Quests() {
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Quest> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getQuests()
      .then((r) => setQuests(r.quests))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Quest>) => {
    try {
      if (data.id) {
        await adminApi.updateQuest(data.id, data);
        toast({ title: "Quest updated" });
      } else {
        await adminApi.createQuest(data);
        toast({ title: "Quest created" });
      }
      setForm(null);
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this quest?")) return;
    try {
      await adminApi.deleteQuest(id);
      toast({ title: "Quest deleted" });
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-white">Quests</h2>
        <button
          onClick={() => setForm({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-black text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> New Quest
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {quests.map((q) => (
            <div key={q.id} className="rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-semibold">
                      {q.questType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">target: {q.target}</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.reward} HP · {q.totalCompletions} completions
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setForm(q)} className="p-1.5 rounded-lg bg-border/20 text-muted-foreground hover:text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(q.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && quests.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No quests yet</p>
          )}
        </div>
      )}

      {form && <QuestForm initial={form} onSave={save} onCancel={() => setForm(null)} />}
    </div>
  );
}
