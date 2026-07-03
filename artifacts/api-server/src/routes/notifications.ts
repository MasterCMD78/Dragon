import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, lt, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

const VALID_TYPES = new Set([
  "mining",
  "referral",
  "task",
  "quest",
  "achievement",
  "system",
]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// ---------------------------------------------------------------------------
// GET /notifications/unread-count
// Must be declared before /:id routes to avoid "unread-count" matching as :id
// ---------------------------------------------------------------------------
router.get(
  "/notifications/unread-count",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    try {
      const [row] = await db
        .select({ count: count() })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.telegramId, user.telegramId),
            eq(notificationsTable.read, false),
          ),
        );

      res.json({ count: Number(row?.count ?? 0) });
    } catch (err) {
      req.log.error({ err }, "Failed to get unread notification count");
      res.status(500).json({ error: "Failed to get unread count" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /notifications/read-all
// ---------------------------------------------------------------------------
router.post(
  "/notifications/read-all",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    try {
      await db
        .update(notificationsTable)
        .set({ read: true })
        .where(
          and(
            eq(notificationsTable.telegramId, user.telegramId),
            eq(notificationsTable.read, false),
          ),
        );

      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "Failed to mark all notifications read");
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /notifications
// Query params:
//   type   – filter by notification type (mining|referral|task|quest|achievement|system)
//   cursor – last seen notification id for cursor pagination (exclusive)
//   limit  – page size (default 20, max 50)
// ---------------------------------------------------------------------------
router.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const rawType = req.query["type"] as string | undefined;
    const rawCursor = req.query["cursor"] as string | undefined;
    const rawLimit = req.query["limit"] as string | undefined;

    const typeFilter = rawType && VALID_TYPES.has(rawType) ? rawType : null;
    const cursor = rawCursor ? parseInt(rawCursor, 10) : null;
    const limit = Math.min(
      rawLimit ? parseInt(rawLimit, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
      MAX_LIMIT,
    );

    if (cursor !== null && isNaN(cursor)) {
      res.status(400).json({ error: "Invalid cursor" });
      return;
    }

    try {
      const conditions = [
        eq(notificationsTable.telegramId, user.telegramId),
        ...(typeFilter ? [eq(notificationsTable.type, typeFilter)] : []),
        ...(cursor !== null ? [lt(notificationsTable.id, cursor)] : []),
      ];

      const rows = await db
        .select()
        .from(notificationsTable)
        .where(and(...conditions))
        .orderBy(desc(notificationsTable.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const notifications = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor =
        hasMore && notifications.length > 0
          ? notifications[notifications.length - 1]!.id
          : null;

      res.json({
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          relatedEntity: n.relatedEntity ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        hasMore,
        nextCursor,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to list notifications");
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /notifications/:id/read
// ---------------------------------------------------------------------------
router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid notification id" });
      return;
    }

    try {
      const [existing] = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.id, id),
            eq(notificationsTable.telegramId, user.telegramId),
          ),
        )
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      await db
        .update(notificationsTable)
        .set({ read: true })
        .where(eq(notificationsTable.id, id));

      res.json({ success: true });
    } catch (err) {
      req.log.error({ err, id }, "Failed to mark notification read");
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  },
);

export default router;
