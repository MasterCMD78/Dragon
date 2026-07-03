import React, { useState, useEffect, useCallback } from "react";
import { adminApi, type AdminLog } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

function actionColor(action: string) {
  if (action.includes("ban")) return "text-red-400";
  if (action.includes("admin")) return "text-yellow-400";
  if (action.includes("grant") || action.includes("approve")) return "text-emerald-400";
  if (action.includes("deduct") || action.includes("reject") || action.includes("delete")) return "text-orange-400";
  if (action.includes("broadcast")) return "text-blue-400";
  return "text-muted-foreground";
}

const LIMIT = 50;

export function Logs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (o: number, replace = true) => {
      if (replace) setLoading(true);
      try {
        const res = await adminApi.getLogs(LIMIT, o);
        if (replace) {
          setLogs(res.logs);
        } else {
          setLogs((prev) => [...prev, ...res.logs]);
        }
        setTotal(res.total);
        setOffset(o);
      } catch (e: unknown) {
        toast({ title: (e as Error).message, variant: "destructive" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => { load(0); }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load(0);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold text-white">Audit Log</h2>
          <p className="text-xs text-muted-foreground">{total.toLocaleString()} entries</p>
        </div>
        <button onClick={refresh} className="p-2 rounded-xl border border-border/40 text-muted-foreground hover:text-white">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-1.5">
        {loading && logs.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className="px-3 py-2.5 rounded-xl border border-border/30 bg-card/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.targetTelegramId && (
                      <span className="text-xs text-muted-foreground"> → {log.targetTelegramId}</span>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      by {log.adminTelegramId}
                      {log.details ? ` · ${log.details}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {logs.length < total && (
              <button
                onClick={() => load(offset + LIMIT, false)}
                disabled={loading}
                className="py-3 text-sm text-muted-foreground hover:text-white border border-border/30 rounded-xl"
              >
                Load more ({total - logs.length} remaining)
              </button>
            )}
            {!loading && logs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No audit entries yet</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
