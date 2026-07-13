import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BarChart3, Eye, Monitor, ArrowUpRight } from "lucide-react";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/admin/analytics?period=${period}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">Analytics</h1>
        <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-1 flex">
          {["1d", "7d", "30d"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading analytics...</div>
      ) : !data ? (
        <div className="py-20 text-center text-red-500">Failed to load data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <div className="text-sm text-muted-foreground mb-1">Total Pageviews</div>
              <div className="text-4xl font-heading font-bold">{data.totalViews.toLocaleString()}</div>
            </div>
            
            {/* Simple sparkline viz */}
            <div className="md:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 flex flex-col justify-end">
              <div className="text-sm font-medium text-muted-foreground mb-4">Views over time</div>
              <div className="h-32 flex items-end gap-2 w-full">
                {data.byDay.map((day: any, i: number) => {
                  const max = Math.max(...data.byDay.map((d: any) => d.views), 1);
                  const h = Math.max((day.views / max) * 100, 2);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="absolute bottom-full mb-2 bg-black text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {day.day}: {day.views} views
                      </div>
                      <div className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm" style={{ height: `${h}%` }}></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{data.byDay[0]?.day}</span>
                <span>{data.byDay[data.byDay.length-1]?.day}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-primary" /> Top Pages</h2>
              <div className="space-y-4">
                {data.topPages.map((page: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="truncate pr-4 text-sm font-mono text-muted-foreground hover:text-primary cursor-default">{page.path}</div>
                    <div className="font-bold bg-white/5 px-3 py-1 rounded text-sm">{page.views.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2"><Monitor className="w-5 h-5 text-primary" /> Devices</h2>
              <div className="space-y-4">
                {data.byDevice.map((dev: any, i: number) => {
                  const pct = ((dev.views / data.totalViews) * 100).toFixed(1);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{dev.deviceType}</span>
                        <span className="text-muted-foreground">{pct}% ({dev.views})</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
