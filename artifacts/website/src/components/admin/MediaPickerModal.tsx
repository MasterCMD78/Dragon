/**
 * MediaPickerModal
 *
 * A reusable modal that lets the admin pick an image from the Media Library.
 * Supports search and pagination. Clicking a thumbnail fires onSelect(url)
 * and closes the modal.
 *
 * Usage:
 *   <MediaPickerModal open={open} onClose={() => setOpen(false)} onSelect={(url) => setField(url)} />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Search, X, ChevronLeft, ChevronRight, Loader2, ImageOff, Check } from "lucide-react";

interface MediaFile {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  /** Currently selected URL — highlighted with a checkmark */
  currentUrl?: string;
}

export function MediaPickerModal({ open, onClose, onSelect, currentUrl }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (q) params.set("search", q);
      const data = await apiFetch<{ files: MediaFile[]; pagination: Pagination }>(
        `/api/admin/media?${params}`
      );
      setFiles(data.files);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSearchInput("");
      load(1, "");
    }
  }, [open]);

  useEffect(() => {
    if (open) load(1, search);
  }, [search]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 400);
  };

  const handleSelect = (file: MediaFile) => {
    const absolute = `${window.location.origin}${file.url}`;
    onSelect(absolute);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0d0d0d] border border-white/10 rounded-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="font-heading font-bold text-lg">Choose From Media Library</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by filename…"
              className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ImageOff className="w-10 h-10 opacity-30" />
              <p className="text-sm">
                {search ? "No images match your search." : "No images uploaded yet. Upload some from the Media Library page."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {files.map((file) => {
                const absUrl = `${window.location.origin}${file.url}`;
                const isSelected = currentUrl === absUrl || currentUrl === file.url;
                return (
                  <button
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    title={file.originalName}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none
                      ${isSelected ? "border-primary ring-2 ring-primary/50" : "border-transparent hover:border-white/30"}`}
                  >
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-black" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 shrink-0">
            <button
              onClick={() => load(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {pagination.total} images · Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => load(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
