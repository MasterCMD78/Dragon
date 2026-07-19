/**
 * Admin Media Library routes
 *
 * POST   /api/admin/media/upload-url  — get a presigned GCS URL for direct upload
 * POST   /api/admin/media             — register a completed upload in the DB
 * GET    /api/admin/media             — list media files (search, pagination)
 * DELETE /api/admin/media/:id         — delete from DB + GCS
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, mediaFilesTable } from "@workspace/db";
import { eq, desc, ilike, count, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/admin";
import { validateBody } from "../middlewares/validate";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── POST /api/admin/media/upload-url ─────────────────────────────────────────

const uploadUrlSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_SIZE_BYTES, "File exceeds 10 MB limit"),
});

router.post(
  "/admin/media/upload-url",
  requireAdmin,
  validateBody(uploadUrlSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { mimeType, size } = req.body as z.infer<typeof uploadUrlSchema>;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      res.status(400).json({ error: "Unsupported file type. Allowed: PNG, JPG, WEBP, GIF" });
      return;
    }

    try {
      const uploadURL = await storage.getObjectEntityUploadURL();
      const objectPath = storage.normalizeObjectEntityPath(uploadURL);

      res.json({ uploadURL, objectPath });
    } catch (err) {
      req.log.error({ err }, "Failed to generate upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

// ── POST /api/admin/media ─────────────────────────────────────────────────────

const registerSchema = z.object({
  objectPath: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

router.post(
  "/admin/media",
  requireAdmin,
  validateBody(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { objectPath, originalName, mimeType, size } =
      req.body as z.infer<typeof registerSchema>;

    const [file] = await db
      .insert(mediaFilesTable)
      .values({ objectPath, originalName, mimeType, size })
      .returning();

    res.status(201).json({ file: toPublic(file) });
  },
);

// ── GET /api/admin/media ──────────────────────────────────────────────────────

router.get("/admin/media", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const offset = (page - 1) * limit;

  const baseWhere = search ? ilike(mediaFilesTable.originalName, `%${search}%`) : undefined;

  const [files, [{ total }]] = await Promise.all([
    db
      .select()
      .from(mediaFilesTable)
      .where(baseWhere)
      .orderBy(desc(mediaFilesTable.uploadedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(mediaFilesTable)
      .where(baseWhere),
  ]);

  res.json({
    files: files.map(toPublic),
    pagination: {
      page,
      limit,
      total: Number(total),
      pages: Math.ceil(Number(total) / limit),
    },
  });
});

// ── DELETE /api/admin/media/:id ───────────────────────────────────────────────

router.delete("/admin/media/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(mediaFilesTable)
    .where(eq(mediaFilesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Media file not found" });
    return;
  }

  // Delete from GCS (best-effort — don't fail the request if GCS delete errors)
  try {
    const file = await storage.getObjectEntityFile(row.objectPath);
    await file.delete();
  } catch (err) {
    if (!(err instanceof ObjectNotFoundError)) {
      req.log.warn({ err, objectPath: row.objectPath }, "GCS delete failed (continuing)");
    }
  }

  await db.delete(mediaFilesTable).where(eq(mediaFilesTable.id, id));

  res.json({ success: true });
});

// ── helpers ───────────────────────────────────────────────────────────────────

function toPublic(f: typeof mediaFilesTable.$inferSelect) {
  // Derive a serving URL from the objectPath: /objects/uploads/uuid
  // → /api/storage/objects/uploads/uuid
  const servingPath = f.objectPath.replace(/^\/objects\//, "");
  return {
    id: f.id,
    objectPath: f.objectPath,
    url: `/api/storage/objects/${servingPath}`,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    uploadedAt: f.uploadedAt,
  };
}

export default router;
