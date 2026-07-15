import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Seo } from "@/components/Seo";

export default function News() {
  const [data, setData] = useState<{ posts: any[], total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const offset = (page - 1) * limit;
    apiFetch<{ posts: any[], total: number }>(`/api/public/blog?limit=${limit}&offset=${offset}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="News | HustleCoin"
        description="The latest HustleCoin announcements, updates, and community news."
        path="/news"
      />
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6 text-center">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Newspaper className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">News & Intel</h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Updates, strategies, and ecosystem announcements.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : !data || data.posts.length === 0 ? (
            <div className="text-center py-20 bg-card border border-white/5 rounded-3xl">
              <p className="text-xl text-muted-foreground">No articles yet — check back soon.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {data.posts.map((post, i) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link href={`/news/${post.slug}`} className="block group">
                      <div className="bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/50 transition-all h-full flex flex-col">
                        <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/50">
                          {post.coverImageUrl ? (
                            <img src={post.coverImageUrl} alt={post.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-black/80 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                              <span className="text-primary font-heading font-bold text-4xl opacity-20">H</span>
                            </div>
                          )}
                          {post.category && (
                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/10">
                              {post.category}
                            </div>
                          )}
                          {post.isFeatured && (
                            <div className="absolute top-4 right-4 bg-primary text-black text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]">
                              Featured
                            </div>
                          )}
                        </div>
                        <div className="p-6 md:p-8 flex flex-col flex-1">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.viewCount}</span>
                          </div>
                          <h2 className="text-2xl font-bold font-heading mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                          <p className="text-muted-foreground line-clamp-3 mb-6 flex-1">{post.excerpt}</p>
                          <span className="text-primary font-medium flex items-center gap-2 group-hover:gap-3 transition-all mt-auto">
                            Read Article &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {data.total > limit && (
                <div className="flex justify-center items-center gap-4 mt-16">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-muted-foreground font-medium text-sm">
                    Page {page} of {Math.ceil(data.total / limit)}
                  </span>
                  <button 
                    disabled={page * limit >= data.total} 
                    onClick={() => setPage(p => p + 1)}
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
