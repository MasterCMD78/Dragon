import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Save, Loader2 } from "lucide-react";

export default function AdminContent() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ content: Record<string, string> }>("/api/admin/content")
      .then(res => setContent(res.content || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/admin/content", { method: "PUT", body: JSON.stringify(content) });
      alert("Content saved successfully");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const sections = [
    {
      title: "Hero Section (Home)",
      keys: [
        { key: "content_hero_badge", label: "Top Badge" },
        { key: "content_hero_title", label: "Headline (HTML allowed for <span class='gold-gradient-text'>)", type: "textarea" },
        { key: "content_hero_subtitle", label: "Subtitle", type: "textarea" },
        { key: "content_hero_cta_primary", label: "Primary Button Text" },
        { key: "content_hero_cta_secondary", label: "Secondary Button Text" },
      ]
    },
    {
      title: "About Section",
      keys: [
        { key: "content_about_headline", label: "Headline" },
        { key: "content_about_body", label: "Body Text (Markdown allowed)", type: "textarea" },
      ]
    },
    {
      title: "Global Details",
      keys: [
        { key: "content_footer_tagline", label: "Footer Tagline" },
        { key: "content_contact_email", label: "Support Email" },
        { key: "content_contact_note", label: "Contact Page Note", type: "textarea" },
      ]
    }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Static Content</h1>
        <button type="submit" disabled={saving} className="bg-primary text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.title} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-6 text-primary">{section.title}</h2>
            <div className="space-y-5">
              {section.keys.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea 
                      value={content[f.key] || ""} 
                      onChange={e => handleChange(f.key, e.target.value)}
                      rows={4}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono text-sm resize-y"
                    />
                  ) : (
                    <input 
                      type="text"
                      value={content[f.key] || ""} 
                      onChange={e => handleChange(f.key, e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary outline-none"
                    />
                  )}
                  <div className="text-xs text-muted-foreground mt-1 opacity-50">Key: {f.key}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}
