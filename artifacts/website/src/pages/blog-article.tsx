import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Calendar, Eye, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

export default function BlogArticle() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ post: any }>(`/api/public/blog/${slug}`)
      .then(res => setPost(res.post))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error || !post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-8">The transmission you're looking for doesn't exist.</p>
        <Link href="/news" className="bg-primary text-black font-bold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
          Return to News
        </Link>
      </div>
    );
  }

  // Very simple markdown to HTML parser for display
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gim, '<h3 className="text-2xl font-bold mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 className="text-3xl font-bold mt-10 mb-5">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 className="text-4xl font-bold mt-12 mb-6">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' class='text-primary hover:underline' target='_blank'>$1</a>")
      .replace(/\n\n/g, '</p><p className="mb-4 leading-relaxed text-lg text-white/90">');
    
    return `<p className="mb-4 leading-relaxed text-lg text-white/90">${html}</p>`;
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: { "@type": "Organization", name: "HustleCoin" },
  };

  return (
    <article className="pb-24">
      <Seo
        title={`${post.seoTitle || post.title} | HustleCoin`}
        description={post.excerpt || post.title}
        path={`/news/${post.slug}`}
        image={post.coverImageUrl || undefined}
        type="article"
        jsonLd={articleJsonLd}
      />
      <div className="container mx-auto px-4 md:px-6 max-w-4xl pt-12 md:pt-20">
        <Link href="/news" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 font-medium">
            {post.category && (
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider text-xs border border-primary/20">
                {post.category}
              </span>
            )}
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> {post.viewCount} views</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-8 leading-tight">
            {post.title}
          </h1>
        </motion.div>
      </div>

      {post.coverImageUrl && (
        <motion.div 
          className="container mx-auto px-4 md:px-6 max-w-5xl my-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <img src={post.coverImageUrl} alt={post.title} loading="eager" fetchPriority="high" decoding="async" className="w-full h-auto max-h-[600px] object-cover rounded-3xl shadow-2xl border border-white/10" />
        </motion.div>
      )}

      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <motion.div 
          className="prose prose-invert prose-lg max-w-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap items-center gap-3">
            <Tag className="w-5 h-5 text-muted-foreground" />
            {post.tags.map((tag: string, i: number) => (
              <span key={i} className="bg-white/5 text-white/80 px-3 py-1 rounded-md text-sm border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
