import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";

export default function AdminBlog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");

  const fetchPosts = () => {
    setLoading(true);
    apiFetch<{ posts: any[] }>(`/api/admin/blog?status=${status}`)
      .then(res => setPosts(res.posts))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, [status]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      fetchPosts();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Blog Posts</h1>
        <Link href="/admin/blog/new" className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-4">
        {["all", "published", "draft"].map(s => (
          <button 
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${status === s ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No posts found.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {posts.map(post => (
              <div key={post.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  {post.coverImageUrl ? (
                    <img src={post.coverImageUrl} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-16 bg-white/5 rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">{post.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {post.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {post.category && <span className="bg-white/5 px-2 py-0.5 rounded">{post.category}</span>}
                      <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.viewCount}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 sm:ml-4">
                  <Link href={`/admin/blog/${post.id}`} className="p-2 bg-white/5 rounded hover:bg-white/10 text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(post.id)} className="p-2 bg-red-500/10 rounded hover:bg-red-500/20 text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
