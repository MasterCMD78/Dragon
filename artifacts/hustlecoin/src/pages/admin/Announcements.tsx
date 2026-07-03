import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type Announcement } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pin, PinOff, Pencil, Trash2 } from "lucide-react";

function AnnouncementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Announcement>;
  onSave: (data: Partial<Announcement>) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(initial?.message ?? "");
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-3">
      <div className="w-full max-w-[420px] bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-white font-semibold">{initial?.id ? "Edit Announcement" : "New Announcement"}</h3>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Announcement content…"
            className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary/50 resize-none"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setIsPinned((p) => !p)}
            className={`w-10 h-5 rounded-full transition-colors ${isPinned ? "bg-primary" : "bg-border"}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${isPinned ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-muted-foreground">Pin announcement</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border/50 text-muted-foreground text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...initial, message, isPinned })}
            className="flex-1 py-3 rounded-xl bg-primary text-black text-sm font-semibold"
          >
            {initial?.id ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Announcements() {
  const { toast } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Announcement> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getAnnouncements()
      .then((r) => setItems(r.announcements))
      .catch((e: Error) => toast({ title: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Announcement>) => {
    try {
      if (data.id) {
        await adminApi.updateAnnouncement(data.id, data);
        toast({ title: "Announcement updated" });
      } else {
        await adminApi.createAnnouncement(data);
        toast({ title: "Announcement created" });
      }
      setForm(null);
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await adminApi.deleteAnnouncement(id);
      toast({ title: "Deleted" });
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const togglePin = async (item: Announcement) => {
    try {
      if (item.isPinned) {
        await adminApi.unpinAnnouncement(item.id);
      } else {
        await adminApi.pinAnnouncement(item.id);
      }
      load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-white">Announcements</h2>
        <button
          onClick={() => setForm({})}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-black text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.isPinned ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  {item.isPinned && <Pin className="w-3 h-3 text-primary" />}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => togglePin(item)} className="p-1.5 rounded-lg bg-border/20 text-muted-foreground hover:text-white">
                    {item.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setForm(item)} className="p-1.5 rounded-lg bg-border/20 text-muted-foreground hover:text-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white line-clamp-3">{item.message}</p>
              {item.sentAt && (
                <p className="text-[10px] text-emerald-400 mt-1">Sent {new Date(item.sentAt).toLocaleString()}</p>
              )}
            </div>
          ))}
          {!loading && items.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No announcements yet</p>
          )}
        </div>
      )}

      {form && <AnnouncementForm initial={form} onSave={save} onCancel={() => setForm(null)} />}
    </div>
  );
}
