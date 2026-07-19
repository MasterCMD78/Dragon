import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  BarChart3,
  Eye,
  Monitor,
  ArrowUpRight,
  Globe,
  Smartphone,
  Chrome,
  Users,
  BookOpen,
  Clock,
  RefreshCw,
  MapPin,
  TrendingUp,
  Wifi,
} from "lucide-react";

type AnalyticsData = {
  period: string;
  totalViews: number;
  liveVisitors: number;
  byDay: { label: string; views: number }[];
  topPages: { path: string; views: number }[];
  byDevice: { deviceType: string; views: number }[];
  byCountry: { country: string | null; views: number }[];
  byCity: { city: string | null; views: number }[];
  byBrowser: { browser: string | null; views: number }[];
  byTrafficSource: { trafficSource: string | null; views: number }[];
  topBlogPosts: { id: number; title: string; slug: string; views: number }[];
  avgSessionDuration: number;
  returningVsNew: { new: number; returning: number };
};

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ProgressBar({ label, value, total, color = "bg-primary/60" }: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize truncate pr-4">{label}</span>
        <span className="text-muted-foreground shrink-0">{pct}% ({value.toLocaleString()})</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
      <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

const TRAFFIC_SOURCE_COLORS: Record<string, string> = {
  Google: "bg-blue-500/60",
  TikTok: "bg-pink-500/60",
  Telegram: "bg-sky-500/60",
  X: "bg-white/60",
  Facebook: "bg-indigo-500/60",
  Instagram: "bg-fuchsia-500/60",
  Discord: "bg-violet-500/60",
  Direct: "bg-primary/60",
  Referral: "bg-amber-500/60",
  Unknown: "bg-white/20",
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/admin/analytics?period=${period}`)
      .then((d: AnalyticsData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, refreshKey]);

  const totalViews = data?.totalViews ?? 0;
  const totalDevices = data?.byDevice.reduce((a, b) => a + b.views, 0) ?? 0;
  const totalBrowsers = data?.byBrowser.reduce((a, b) => a + b.views, 0) ?? 0;
  const totalSources = data?.byTrafficSource.reduce((a, b) => a + b.views, 0) ?? 0;
  const totalVisitors = (data?.returningVsNew.new ?? 0) + (data?.returningVsNew.returning ?? 0);

  const PERIOD_LABELS: Record<string, string> = { "1d": "1D", "7d": "7D", "30d": "30D", "1y": "1Y" };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Analytics</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 rounded-lg border border-white/10 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-1 flex">
            {Object.entries(PERIOD_LABELS).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? "bg-primary text-black" : "text-muted-foreground hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading analytics...</div>
      ) : !data ? (
        <div className="py-20 text-center text-red-500">Failed to load data</div>
      ) : (
        <>
          {/* ── Top stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Pageviews */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Total Pageviews</div>
              <div className="text-3xl font-heading font-bold">{totalViews.toLocaleString()}</div>
            </div>

            {/* Live Visitors */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-3">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Live Visitors</div>
              <div className="text-3xl font-heading font-bold text-green-400">
                {data.liveVisitors.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">past 5 min</div>
            </div>

            {/* Avg Session Duration */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Avg Session</div>
              <div className="text-3xl font-heading font-bold text-amber-400">
                {data.avgSessionDuration > 0 ? formatDuration(data.avgSessionDuration) : "—"}
              </div>
            </div>

            {/* Returning vs New */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Visitors</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-bold">{totalVisitors.toLocaleString()}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className="text-primary">{data.returningVsNew.new.toLocaleString()} new</span>
                <span className="text-muted-foreground">{data.returningVsNew.returning.toLocaleString()} returning</span>
              </div>
            </div>
          </div>

          {/* ── Chart ── */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
            <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Views over time
              <span className="text-xs ml-auto text-muted-foreground/60">
                {period === "1d" ? "by hour" : period === "1y" ? "by month" : "by day"}
              </span>
            </div>
            {data.byDay.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <>
                <div className="h-32 flex items-end gap-1 w-full">
                  {data.byDay.map((point, i) => {
                    const max = Math.max(...data.byDay.map((d) => d.views), 1);
                    const h = Math.max((point.views / max) * 100, 2);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative min-w-0">
                        <div className="absolute bottom-full mb-2 bg-black border border-white/10 text-xs p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {point.label}: {point.views.toLocaleString()} views
                        </div>
                        <div className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{data.byDay[0]?.label}</span>
                  <span>{data.byDay[data.byDay.length - 1]?.label}</span>
                </div>
              </>
            )}
          </div>

          {/* ── Top Pages + Devices ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionCard title="Top Pages" icon={<ArrowUpRight className="w-5 h-5" />}>
              {data.topPages.length === 0 ? (
                <div className="text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-4">
                  {data.topPages.map((page, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="truncate pr-4 text-sm font-mono text-muted-foreground hover:text-primary cursor-default">
                        {page.path}
                      </div>
                      <div className="font-bold bg-white/5 px-3 py-1 rounded text-sm shrink-0">
                        {page.views.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Devices" icon={<Monitor className="w-5 h-5" />}>
              {data.byDevice.length === 0 ? (
                <div className="text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="space-y-4">
                  {data.byDevice.map((dev, i) => (
                    <ProgressBar key={i} label={dev.deviceType} value={dev.views} total={totalDevices} />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Countries + Cities ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionCard title="Countries" icon={<Globe className="w-5 h-5" />}>
              {data.byCountry.length === 0 ? (
                <div className="text-muted-foreground text-sm">No geo data yet — populates as new visits come in</div>
              ) : (
                <div className="space-y-4">
                  {data.byCountry.map((row, i) => (
                    <ProgressBar
                      key={i}
                      label={row.country ?? "Unknown"}
                      value={row.views}
                      total={data.byCountry.reduce((a, b) => a + b.views, 0)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Cities" icon={<MapPin className="w-5 h-5" />}>
              {data.byCity.length === 0 ? (
                <div className="text-muted-foreground text-sm">No geo data yet — populates as new visits come in</div>
              ) : (
                <div className="space-y-4">
                  {data.byCity.map((row, i) => (
                    <ProgressBar
                      key={i}
                      label={row.city ?? "Unknown"}
                      value={row.views}
                      total={data.byCity.reduce((a, b) => a + b.views, 0)}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Browsers + Traffic Sources ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionCard title="Browsers" icon={<Chrome className="w-5 h-5" />}>
              {data.byBrowser.length === 0 ? (
                <div className="text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="space-y-4">
                  {data.byBrowser.map((row, i) => (
                    <ProgressBar key={i} label={row.browser ?? "Other"} value={row.views} total={totalBrowsers} />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Traffic Sources" icon={<TrendingUp className="w-5 h-5" />}>
              {data.byTrafficSource.length === 0 ? (
                <div className="text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="space-y-4">
                  {data.byTrafficSource.map((row, i) => {
                    const src = row.trafficSource ?? "Unknown";
                    return (
                      <ProgressBar
                        key={i}
                        label={src}
                        value={row.views}
                        total={totalSources}
                        color={TRAFFIC_SOURCE_COLORS[src] ?? "bg-primary/60"}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Most Read Blog Posts + Returning vs New ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionCard title="Most Read Blog Posts" icon={<BookOpen className="w-5 h-5" />}>
              {data.topBlogPosts.length === 0 ? (
                <div className="text-muted-foreground text-sm">No blog posts yet</div>
              ) : (
                <div className="space-y-4">
                  {data.topBlogPosts.map((post, i) => (
                    <div key={post.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{post.title}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">/blog/{post.slug}</div>
                      </div>
                      <div className="font-bold bg-white/5 px-3 py-1 rounded text-sm shrink-0">
                        {(post.views ?? 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Returning vs New Visitors" icon={<Users className="w-5 h-5" />}>
              {totalVisitors === 0 ? (
                <div className="text-muted-foreground text-sm">No visitor data yet — populates as visits come in</div>
              ) : (
                <div className="space-y-6">
                  <ProgressBar label="New Visitors" value={data.returningVsNew.new} total={totalVisitors} color="bg-primary/60" />
                  <ProgressBar label="Returning Visitors" value={data.returningVsNew.returning} total={totalVisitors} color="bg-violet-500/60" />
                  {/* Donut-style visual */}
                  <div className="flex items-center gap-6 pt-2">
                    {[
                      { label: "New", value: data.returningVsNew.new, color: "bg-primary" },
                      { label: "Returning", value: data.returningVsNew.returning, color: "bg-violet-500" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-bold">{value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
