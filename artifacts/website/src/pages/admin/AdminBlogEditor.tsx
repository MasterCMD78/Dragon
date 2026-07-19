import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";

export default function AdminBlogEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    category: "",
    tags: "",
    seoTitle: "",
    seoDescription: "",
    isPublished: false,
    isFeatured: false,
  });

  useEffect(() => {
    if (!isNew) {
      apiFetch<{ post: any }>(`/api/admin/blog/${id}`)
        .then(res => {
          const p = res.post;
          setFormData({
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || "",
            content: p.content,
            coverImageUrl: p.coverImageUrl || "",
            category: p.category || "",
            tags: p.tags ? (Array.isArray(p.tags) ? p.tags.join(", ") : p.tags) : "",
            seoTitle: p.seoTitle || "",
            seoDescription: p.seoDescription || "",
            isPublished: p.isPublished,
            isFeatured: p.isFeatured,
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Auto-generate slug from title if empty or currently typing title and slug is in sync
      ...(name === 'title' && (prev.slug === "" || prev.slug === prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) 
        ? { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') } 
        : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        ...formData,
        // Convert empty strings to null for nullable URL/text fields so the
        // backend's z.string().url().nullable() validator accepts them.
        coverImageUrl: formData.coverImageUrl.trim() || null,
        seoTitle: formData.seoTitle.trim() || null,
        seoDescription: formData.seoDescription.trim() || null,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      if (isNew) {
        await apiFetch("/api/admin/blog", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/admin/blog/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      setLocation("/admin/blog");
    } catch (err: any) {
      // Surface field-level validation details when the API returns them
      const details = (err as any).details as Array<{ path: string; message: string }> | undefined;
      if (details && details.length > 0) {
        const fieldErrors = details.map(d => `• ${d.path || "field"}: ${d.message}`).join("\n");
        alert(`Validation failed:\n${fieldErrors}`);
      } else {
        alert(err.message ?? "Failed to save post");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isPublished" checked={formData.isPublished} onChange={handleChange} className="w-4 h-4 rounded bg-black border-white/20 text-primary focus:ring-primary" />
            <span className="text-sm font-medium">Published</span>
          </label>
          <button type="submit" disabled={saving} className="bg-primary text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Post
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
              <input name="title" value={formData.title} onChange={handleChange} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary outline-none text-xl font-bold" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Content (Markdown)</label>
              <textarea name="content" value={formData.content} onChange={handleChange} required rows={20} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono text-sm leading-relaxed resize-y" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="font-heading font-bold text-lg mb-4">Metadata</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Slug</label>
              <input name="slug" value={formData.slug} onChange={handleChange} required className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
              <input name="category" value={formData.category} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Tags (comma separated)</label>
              <input name="tags" value={formData.tags} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Cover Image URL</label>
              <input name="coverImageUrl" value={formData.coverImageUrl} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="https://..." />
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs text-muted-foreground hover:text-white transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Choose From Media Library
              </button>
              {formData.coverImageUrl && (
                <img src={formData.coverImageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-white/10" />
              )}
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="w-4 h-4 rounded bg-black border-white/20 text-primary focus:ring-primary" />
                <span className="text-sm">Featured Post</span>
              </label>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl space-y-4">
            <h3 className="font-heading font-bold text-lg mb-4">SEO</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">SEO Title</label>
              <input name="seoTitle" value={formData.seoTitle} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="Overrides title for SEO" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Excerpt / Description</label>
              <textarea name="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
          </div>
        </div>
      </div>
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setFormData(prev => ({ ...prev, coverImageUrl: url }))}
        currentUrl={formData.coverImageUrl}
      />
    </form>
  );
}
