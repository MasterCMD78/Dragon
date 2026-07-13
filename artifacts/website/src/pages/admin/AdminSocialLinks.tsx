import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Save, Loader2, Link as LinkIcon } from "lucide-react";

export default function AdminSocialLinks() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ links: Record<string, string> }>("/api/admin/social-links")
      .then(res => setLinks(res.links || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/admin/social-links", { method: "PUT", body: JSON.stringify(links) });
      alert("Social links updated");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setLinks(prev => ({ ...prev, [key]: value }));
  };

  const platforms = [
    { key: "social_telegram", label: "Telegram", placeholder: "https://t.me/..." },
    { key: "social_twitter", label: "Twitter / X", placeholder: "https://x.com/..." },
    { key: "social_discord", label: "Discord", placeholder: "https://discord.gg/..." },
    { key: "social_youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
    { key: "social_medium", label: "Medium", placeholder: "https://medium.com/..." },
    { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
    { key: "social_tiktok", label: "TikTok", placeholder: "https://tiktok.com/..." },
    { key: "social_github", label: "GitHub", placeholder: "https://github.com/..." },
  ];

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Social Links</h1>
        <button type="submit" disabled={saving} className="bg-primary text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Links
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl space-y-6">
        <p className="text-muted-foreground text-sm border-b border-white/10 pb-4">
          Leave a field blank to hide its corresponding icon on the public website footer/navbar.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {platforms.map(p => (
            <div key={p.key}>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" /> {p.label}
              </label>
              <input 
                type="url"
                value={links[p.key] || ""} 
                onChange={e => handleChange(p.key, e.target.value)}
                placeholder={p.placeholder}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
