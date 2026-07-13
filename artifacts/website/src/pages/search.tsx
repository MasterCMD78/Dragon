import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Search as SearchIcon, Loader2, ArrowRight, Newspaper, Map } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      inputRef.current?.focus();
    }
  }, [initialQuery]);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await apiFetch<{ results: any[] }>(`/api/public/search?q=${encodeURIComponent(q)}`);
      setResults(res.results || []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(query)}`);
      handleSearch(query);
    }
  };

  const blogs = results.filter(r => r.type === "blog");
  const roadmaps = results.filter(r => r.type === "roadmap");

  return (
    <div className="flex flex-col w-full min-h-[70vh]">
      <section className="pt-20 pb-10 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <form onSubmit={onSubmit} className="relative">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
            <input 
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full bg-card border border-white/10 rounded-full pl-16 pr-6 py-5 text-xl text-white focus:outline-none focus:border-primary shadow-xl transition-colors"
            />
            <button 
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-black font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </button>
          </form>
        </div>
      </section>

      <section className="px-4 md:px-6 pb-20 flex-1">
        <div className="container mx-auto max-w-3xl">
          {!searched ? (
            <div className="text-center text-muted-foreground pt-20">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-xl">What are you looking for?</p>
            </div>
          ) : loading ? (
            <div className="space-y-4 pt-10">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-muted-foreground pt-20">
              <p className="text-xl text-white mb-2">No results found for "{query}"</p>
              <p>Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="space-y-10 pt-6">
              <div className="text-sm font-medium text-muted-foreground border-b border-white/10 pb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>

              {blogs.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-heading font-bold flex items-center gap-2 mb-4">
                    <Newspaper className="w-5 h-5 text-primary" /> Blog Articles
                  </h2>
                  {blogs.map(item => (
                    <Link key={item.id} href={`/news/${item.slug}`} className="block group">
                      <div className="bg-card border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-colors">
                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{item.excerpt}</p>
                        <span className="text-xs text-primary font-medium flex items-center gap-1">Read Article <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {roadmaps.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-heading font-bold flex items-center gap-2 mb-4">
                    <Map className="w-5 h-5 text-primary" /> Roadmap Phases
                  </h2>
                  {roadmaps.map(item => (
                    <Link key={item.id} href={`/roadmap`} className="block group">
                      <div className="bg-card border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                          <span className="bg-white/10 text-xs px-2 py-0.5 rounded capitalize">{item.status.replace("_", " ")}</span>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{item.description}</p>
                        <span className="text-xs text-primary font-medium flex items-center gap-1">View Roadmap <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
