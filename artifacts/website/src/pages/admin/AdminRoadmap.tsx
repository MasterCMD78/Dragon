import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

export default function AdminRoadmap() {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  
  const defaultForm = { title: "", description: "", status: "planned", progress: 0, sortOrder: 0, items: [""] };
  const [formData, setFormData] = useState(defaultForm);

  const fetchRoadmap = () => {
    setLoading(true);
    apiFetch<{ phases: any[] }>("/api/admin/roadmap")
      .then(res => setPhases(res.phases))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleEdit = (phase: any) => {
    setFormData({
      title: phase.title,
      description: phase.description || "",
      status: phase.status,
      progress: phase.progress,
      sortOrder: phase.sortOrder,
      items: phase.items.length ? phase.items : [""]
    });
    setEditingId(phase.id);
  };

  const handleNew = () => {
    setFormData({ ...defaultForm, sortOrder: phases.length + 1 });
    setEditingId('new');
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData, items: formData.items.filter(Boolean) };
      if (editingId === 'new') {
        await apiFetch("/api/admin/roadmap", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/admin/roadmap/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      setEditingId(null);
      fetchRoadmap();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this phase?")) return;
    try {
      await apiFetch(`/api/admin/roadmap/${id}`, { method: "DELETE" });
      fetchRoadmap();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Roadmap Management</h1>
        <button onClick={handleNew} className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Phase
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {editingId === 'new' && (
          <div className="bg-[#0a0a0a] border border-primary/50 rounded-2xl p-6 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
            <RoadmapForm data={formData} setData={setFormData} onSave={handleSave} onCancel={() => setEditingId(null)} />
          </div>
        )}

        {phases.map(phase => (
          <div key={phase.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 transition-all hover:border-white/20">
            {editingId === phase.id ? (
              <RoadmapForm data={formData} setData={setFormData} onSave={handleSave} onCancel={() => setEditingId(null)} />
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{phase.title}</h2>
                      <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold ${
                        phase.status === 'completed' ? 'bg-primary/20 text-primary' : 
                        phase.status === 'in_progress' ? 'bg-white/20 text-white' : 'bg-white/5 text-muted-foreground'
                      }`}>
                        {phase.status.replace("_", " ")}
                      </span>
                    </div>
                    {phase.description && <p className="text-muted-foreground text-sm">{phase.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(phase)} className="p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(phase.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {phase.progress > 0 && (
                  <div className="mb-6 w-full max-w-md">
                    <div className="flex justify-between text-xs mb-1 text-muted-foreground"><span>Progress</span><span>{phase.progress}%</span></div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${phase.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <ul className="space-y-2">
                  {phase.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapForm({ data, setData, onSave, onCancel }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Title</label>
          <input type="text" value={data.title} onChange={e => setData({...data, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Status</label>
          <select value={data.status} onChange={e => setData({...data, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white">
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Progress (%)</label>
          <input type="number" min="0" max="100" value={data.progress} onChange={e => setData({...data, progress: Number(e.target.value)})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Sort Order</label>
          <input type="number" value={data.sortOrder} onChange={e => setData({...data, sortOrder: Number(e.target.value)})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-muted-foreground mb-1">Description</label>
          <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} rows={2} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white resize-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-2">Checklist Items</label>
        {data.items.map((item: string, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="text" value={item} onChange={e => {
              const newItems = [...data.items];
              newItems[i] = e.target.value;
              setData({...data, items: newItems});
            }} className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="Item description..." />
            <button onClick={() => {
              setData({...data, items: data.items.filter((_: any, idx: number) => idx !== i)});
            }} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"><X className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => setData({...data, items: [...data.items, ""]})} className="text-sm text-primary hover:underline">+ Add Item</button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button onClick={onCancel} className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10">Cancel</button>
        <button onClick={onSave} className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 flex items-center gap-2"><Save className="w-4 h-4" /> Save Phase</button>
      </div>
    </div>
  );
}
