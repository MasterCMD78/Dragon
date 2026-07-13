import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "banner" | "popup" | "alert" | "maintenance" | "emergency" | "version_update";
  isDismissible: boolean;
  expiresAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export function AnnouncementOverlay() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState<Announcement | null>(null);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("dismissed_announcements") || "[]");
    setDismissedIds(ids);

    apiFetch<{ announcements: Announcement[] }>("/api/public/announcements")
      .then(res => {
        const active = res.announcements.filter(
          a => (!a.expiresAt || new Date(a.expiresAt) > new Date())
        );
        setAnnouncements(active);
        
        // Find first undismissed popup
        const popup = active.find(a => a.type === "popup" && !ids.includes(a.id));
        if (popup) {
          setShowPopup(popup);
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    const newIds = [...dismissedIds, id];
    setDismissedIds(newIds);
    localStorage.setItem("dismissed_announcements", JSON.stringify(newIds));
    if (showPopup?.id === id) {
      setShowPopup(null);
    }
  };

  const getVisibleItems = () => announcements.filter(a => !dismissedIds.includes(a.id) && a.type !== "popup");

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] flex flex-col pointer-events-none">
        <AnimatePresence>
          {getVisibleItems().map(ann => {
            const isRed = ann.type === "emergency" || ann.type === "maintenance";
            const isAlert = ann.type === "alert";
            
            return (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className={`w-full pointer-events-auto flex items-center justify-center p-3 relative ${
                  isRed ? "bg-red-600 text-white font-bold" :
                  isAlert ? "bg-yellow-500 text-black font-bold" :
                  "bg-primary text-black font-bold"
                }`}
              >
                <div className="flex-1 max-w-4xl mx-auto flex items-center justify-between text-sm md:text-base px-8 md:px-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {ann.title && <span className="uppercase tracking-wider mr-2">{ann.title}:</span>}
                    <span>{ann.message}</span>
                  </div>
                  {ann.ctaLabel && ann.ctaUrl && (
                    <a href={ann.ctaUrl} target="_blank" rel="noopener noreferrer" className="ml-4 underline hover:no-underline whitespace-nowrap">
                      {ann.ctaLabel}
                    </a>
                  )}
                </div>
                {ann.isDismissible && (
                  <button onClick={() => dismiss(ann.id)} className="absolute right-4 p-1 hover:bg-black/10 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => showPopup.isDismissible && dismiss(showPopup.id)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card border border-primary/30 p-8 rounded-3xl shadow-2xl relative z-10 max-w-lg w-full text-center"
            >
              {showPopup.isDismissible && (
                <button onClick={() => dismiss(showPopup.id)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                <span className="font-heading font-bold text-2xl">!</span>
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">{showPopup.title}</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">{showPopup.message}</p>
              {showPopup.ctaLabel && showPopup.ctaUrl ? (
                <a 
                  href={showPopup.ctaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full inline-block bg-primary text-black font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors"
                  onClick={() => dismiss(showPopup.id)}
                >
                  {showPopup.ctaLabel}
                </a>
              ) : (
                showPopup.isDismissible && (
                  <button 
                    onClick={() => dismiss(showPopup.id)}
                    className="w-full bg-white/10 text-white font-medium py-3 px-6 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Close
                  </button>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
