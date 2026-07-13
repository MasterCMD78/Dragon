import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Trash2, CheckCircle2, Archive, MessageCircle } from "lucide-react";

export default function AdminContact() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("unread");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchMessages = () => {
    setLoading(true);
    apiFetch<{ messages: any[] }>(`/api/admin/contact?status=${status}`)
      .then(res => setMessages(res.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, [status]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await apiFetch(`/api/admin/contact/${id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      fetchMessages();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete message?")) return;
    try {
      await apiFetch(`/api/admin/contact/${id}`, { method: "DELETE" });
      fetchMessages();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Contact Inbox</h1>

      <div className="flex gap-2 border-b border-white/10 pb-4">
        {["unread", "read", "replied", "archived"].map(s => (
          <button 
            key={s}
            onClick={() => { setStatus(s); setExpandedId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${status === s ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground bg-[#0a0a0a] rounded-2xl border border-white/5">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
            No {status} messages
          </div>
        ) : (
          messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden">
              <div 
                className={`p-4 sm:p-6 cursor-pointer flex justify-between items-center transition-colors hover:bg-white/[0.02] ${status === 'unread' ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`font-bold ${status === 'unread' ? 'text-white' : 'text-white/80'}`}>{msg.name}</span>
                    <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{msg.email}</span>
                  </div>
                  <div className="text-sm text-white/90 font-medium">{msg.subject}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === msg.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 bg-black/50"
                  >
                    <div className="p-6">
                      <div className="whitespace-pre-wrap text-sm text-white/80 leading-relaxed mb-6">
                        {msg.message}
                      </div>

                      <div className="flex gap-2 flex-wrap pt-4 border-t border-white/10">
                        {status !== 'read' && status !== 'replied' && (
                          <button onClick={() => updateStatus(msg.id, 'read')} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors">
                            <CheckCircle2 className="w-4 h-4" /> Mark Read
                          </button>
                        )}
                        {status !== 'replied' && (
                          <button onClick={() => updateStatus(msg.id, 'replied')} className="px-3 py-1.5 text-sm bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg flex items-center gap-2 transition-colors">
                            <MessageCircle className="w-4 h-4" /> Mark Replied
                          </button>
                        )}
                        {status !== 'archived' && (
                          <button onClick={() => updateStatus(msg.id, 'archived')} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors">
                            <Archive className="w-4 h-4" /> Archive
                          </button>
                        )}
                        <button onClick={() => handleDelete(msg.id)} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors ml-auto">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
