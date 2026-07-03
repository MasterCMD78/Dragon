import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type Task, type TaskSubmission } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CheckCheck, X, Eye } from "lucide-react";

function TaskForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Task>;
  onSave: (data: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Partial<Task>>({
    title: "",
    description: "",
    reward: 50,
    link: "",
    status: "active",
    taskType: "manual",
    ...initial,
  });

  const set = (k: keyof Task, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-3">
      <div className="w-full max-w-[420px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
        <h3 className="text-white font-semibold">{initial?.id ? "Edit Task" : "Create Task"}</h3>
        {(
          [
            ["Title", "title", "text"],
            ["Description", "description", "text"],
            ["Reward (HP)", "reward", "number"],
            ["Link (optional)", "link", "text"],
          ] as const
        ).map(([label, key, type]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input
              type={type}
              value={String(data[key as keyof Task] ?? "")}
              onChange={(e) => set(key as keyof Task, type === "number" ? parseInt(e.target.value, 10) : e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
        ))}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <select
              value={data.taskType}
              onChange={(e) => set("taskType", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
            >
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select
              value={data.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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

function SubmissionsPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getSubmissions(task.id, "pending")
      .then((r) => setSubmissions(r.submissions))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [task.id, toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const bulk = async (action: "approve" | "reject") => {
    const ids = selected.size > 0 ? Array.from(selected) : submissions.map((s) => s.id);
    if (ids.length === 0) return;
    try {
      const r = await adminApi.bulkSubmissions(task.id, ids, action);
      toast({ title: `${action === "approve" ? "Approved" : "Rejected"} ${r.affected} submissions` });
      setSelected(new Set());
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
            <p className="text-white font-semibold text-sm">{task.title}</p>
            <p className="text-muted-foreground text-xs">Pending submissions</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 p-3 border-b border-border/20">
          <button
            onClick={() => bulk("approve")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {selected.size > 0 ? `Approve (${selected.size})` : "Approve All"}
          </button>
          <button
            onClick={() => bulk("reject")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold"
          >
            <X className="w-3.5 h-3.5" />
            {selected.size > 0 ? `Reject (${selected.size})` : "Reject All"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No pending submissions</p>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selected.has(s.id) ? "border-primary bg-primary/10" : "border-border/40 bg-background/40"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 shrink-0 ${selected.has(s.id) ? "bg-primary border-primary" : "border-border"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {[s.firstName, s.lastName].filter(Boolean).join(" ") || (s.username && s.username !== "user" ? `@${s.username}` : s.telegramId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.username && s.username !== "user" ? `@${s.username}` : s.telegramId} · {new Date(s.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adminApi.approveSubmission(task.id, s.id).then(() => { toast({ title: "Approved" }); load(); }).catch((err: Error) => toast({ title: err.message, variant: "destructive" }));
                      }}
                      className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adminApi.rejectSubmission(task.id, s.id).then(() => { toast({ title: "Rejected" }); load(); }).catch((err: Error) => toast({ title: err.message, variant: "destructive" }));
                      }}
                      className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Task> | null>(null);
  const [viewSubmissions, setViewSubmissions] = useState<Task | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getTasks()
      .then((r) => setTasks(r.tasks))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Task>) => {
    try {
      if (data.id) {
        await adminApi.updateTask(data.id, data);
        toast({ title: "Task updated" });
      } else {
        await adminApi.createTask(data);
        toast({ title: "Task created" });
      }
      setForm(null);
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await adminApi.deleteTask(id);
      toast({ title: "Task deleted" });
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-white">Tasks</h2>
        <button
          onClick={() => setForm({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-black text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        t.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-border/30 text-muted-foreground"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] bg-border/20 text-muted-foreground px-1.5 py-0.5 rounded">
                      {t.taskType}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.reward} HP reward</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {t.taskType === "manual" && (
                    <button
                      onClick={() => setViewSubmissions(t)}
                      className="relative p-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {t.pendingSubmissions > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-primary text-black text-[9px] font-bold">
                          {t.pendingSubmissions}
                        </span>
                      )}
                    </button>
                  )}
                  <button onClick={() => setForm(t)} className="p-1.5 rounded-lg bg-border/20 text-muted-foreground hover:text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(t.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && <TaskForm initial={form} onSave={save} onCancel={() => setForm(null)} />}
      {viewSubmissions && (
        <SubmissionsPanel task={viewSubmissions} onClose={() => setViewSubmissions(null)} />
      )}
    </div>
  );
}
