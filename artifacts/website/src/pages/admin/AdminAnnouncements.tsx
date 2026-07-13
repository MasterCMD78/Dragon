import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, Megaphone } from "lucide-react";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const fetchAnnouncements = () => {
    setLoading(true);
    apiFetch<{ announcements: any[] }>("/api/admin/website-announcements")
      .then(res => setAnnouncements(res.announcements))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      message: fd.get("message"),
      type: fd.get("type"),
      isActive: fd.get("isActive") === "on",
      isDismissible: fd.get("isDismissible") === "on",
      expiresAt: fd.get("expiresAt") || null,
      ctaLabel: fd.get("ctaLabel") || null,
      ctaUrl: fd.get("ctaUrl") || null,
    };

    try {
      if (editing.id) {
        await apiFetch(`/api/admin/website-announcements/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/admin/website-announcements", { method: "POST", body: JSON.stringify(payload) });
      }
      setEditing(null);
      fetchAnnouncements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete announcement?")) return;
    try {
      await apiFetch(`/api/admin/website-announcements/${id}`, { method: "DELETE" });
      fetchAnnouncements();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Announcements</h1>
        <button onClick={() => setEditing({ isActive: true, isDismissible: true, type: 'banner' })} className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {editing && (
        <div className="bg-[#0a0a0a] border border-primary/50 rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-bold mb-4">{editing.id ? 'Edit' : 'Create'} Announcement</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Title</label>
                <input name="title" defaultValue={editing.title} required className="w-full bg-black border border-white/10 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Type</label>
                <select name="type" defaultValue={editing.type} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2">
                  <option value="banner">Banner (Top)</option>
                  <option value="popup">Popup (Modal)</option>
                  <option value="alert">Alert (Inline)</option>
                  <option value="maintenance">Maintenance (Red)</option>
                  <option value="emergency">Emergency (Red)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-muted-foreground mb-1">Message</label>
                <textarea name="message" defaultValue={editing.message} required rows={3} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">CTA Label (Optional)</label>
                <input name="ctaLabel" defaultValue={editing.ctaLabel} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2" placeholder="e.g. Read More" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">CTA URL (Optional)</label>
                <input name="ctaUrl" defaultValue={editing.ctaUrl} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Expires At (Optional)</label>
                <input type="datetime-local" name="expiresAt" defaultValue={editing.expiresAt ? new Date(editing.expiresAt).toISOString().slice(0, 16) : ""} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 [color-scheme:dark]" />
              </div>
              <div className="flex flex-col gap-2 justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isActive" defaultChecked={editing.isActive} className="w-4 h-4" />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isDismissible" defaultChecked={editing.isDismissible} className="w-4 h-4" />
                  <span className="text-sm">User can dismiss</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 bg-white/5 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-black font-bold rounded-lg">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? <div className="p-10 text-center">Loading...</div> : 
         announcements.length === 0 ? <div className="p-10 text-center text-muted-foreground">No announcements</div> :
         announcements.map(a => (
          <div key={a.id} className={`bg-[#0a0a0a] border rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${a.isActive ? 'border-primary/30' : 'border-white/5 opacity-60'}`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{a.title}</h3>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded capitalize">{a.type}</span>
                  {!a.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Inactive</span>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                {(a.ctaLabel || a.expiresAt) && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {a.ctaLabel && <span>CTA: {a.ctaLabel}</span>}
                    {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button onClick={() => setEditing(a)} className="p-2 bg-white/5 rounded hover:bg-white/10"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(a.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
