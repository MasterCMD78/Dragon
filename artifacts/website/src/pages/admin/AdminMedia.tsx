import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  Upload, Search, Trash2, Copy, Check, Image as ImageIcon,
  Loader2, ChevronLeft, ChevronRight, X, ImageOff,
} from "lucide-react";

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

const ACCEPTED = "image/png,image/jpeg,image/jpg,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function AdminMedia() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
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

  useEffect(() => { load(1, search); }, [search]);

  // Debounced search
  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 400);
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed (PNG, JPG, WEBP, GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert(`File too large. Maximum size is 10 MB. Selected: ${formatBytes(file.size)}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      // Step 1: get presigned URL
      const { uploadURL, objectPath } = await apiFetch<{ uploadURL: string; objectPath: string }>(
        "/api/admin/media/upload-url",
        {
          method: "POST",
          body: JSON.stringify({ originalName: file.name, mimeType: file.type, size: file.size }),
        }
      );

      // Step 2: upload directly to GCS with XHR progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setUploadProgress(95);

      // Step 3: register in DB
      await apiFetch("/api/admin/media", {
        method: "POST",
        body: JSON.stringify({ objectPath, originalName: file.name, mimeType: file.type, size: file.size }),
      });

      setUploadProgress(100);
      await load(1, search);
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    Array.from(fileList).forEach(uploadFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`Delete "${file.originalName}"?\n\nExisting blog posts referencing this image will show a broken image.`)) return;
    setDeletingId(file.id);
    try {
      await apiFetch(`/api/admin/media/${file.id}`, { method: "DELETE" });
      setFiles(prev => prev.filter(f => f.id !== file.id));
      if (previewFile?.id === file.id) setPreviewFile(null);
    } catch (err: any) {
      alert(err.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = (file: MediaFile) => {
    const absolute = `${window.location.origin}${file.url}`;
    navigator.clipboard.writeText(absolute).then(() => {
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Media Library</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload and manage images for use across the site.</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all select-none
          ${dragOver ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/30 bg-[#0a0a0a]"}
          ${uploading ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading… {uploadProgress}%</p>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className={`w-10 h-10 mb-3 ${dragOver ? "text-primary" : "text-white/30"}`} />
            <p className="text-sm font-medium">
              {dragOver ? "Drop to upload" : "Drag & drop images here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, GIF — max 10 MB each</p>
          </>
        )}
      </div>

      {/* Search + stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by filename…"
            className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-primary outline-none"
          />
        </div>
        <p className="text-sm text-muted-foreground shrink-0">
          {pagination.total} {pagination.total === 1 ? "image" : "images"}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ImageOff className="w-12 h-12 opacity-30" />
          <p className="text-sm">{search ? "No images match your search." : "No images uploaded yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
            >
              {/* Preview */}
              <div
                className="aspect-square cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <img
                  src={file.url}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.nextSibling as HTMLElement)?.removeAttribute("hidden");
                  }}
                />
                <div hidden className="absolute inset-0 flex items-center justify-center bg-white/5">
                  <ImageIcon className="w-8 h-8 text-white/20" />
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-white truncate" title={file.originalName}>{file.originalName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(file.uploadedAt)} · {formatBytes(file.size)}</p>
              </div>

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); copyUrl(file); }}
                  className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur flex items-center justify-center hover:bg-primary/20 transition-colors"
                  title="Copy URL"
                >
                  {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                  disabled={deletingId === file.id}
                  className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur flex items-center justify-center hover:bg-red-500/20 transition-colors"
                  title="Delete"
                >
                  {deletingId === file.id
                    ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => load(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="w-9 h-9 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="w-9 h-9 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lightbox preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewFile.url}
              alt={previewFile.originalName}
              className="w-full max-h-[60vh] object-contain bg-black"
            />
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{previewFile.originalName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(previewFile.size)} · {formatDate(previewFile.uploadedAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => copyUrl(previewFile)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors"
                >
                  {copiedId === previewFile.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === previewFile.id ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={() => handleDelete(previewFile)}
                  disabled={deletingId === previewFile.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
