/**
 * Phase 2 admin routes — website CMS, blog, contact, roadmap, analytics, auth.
 * Imported and re-exported from admin.ts.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  blogPostsTable,
  contactMessagesTable,
  siteAnalyticsTable,
  roadmapPhasesTable,
  websiteAnnouncementsTable,
  systemSettingsTable,
  adminLogsTable,
  transactionsTable,
  miningLogsTable,
  achievementUnlocksTable,
  achievementsTable,
  taskCompletionsTable,
  questProgressTable,
  referralsTable,
  notificationsTable,
  SETTING_KEYS,
  SETTING_DEFAULTS,
} from "@workspace/db";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  gte,
  count,
} from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, type AdminRequest } from "../middlewares/admin";
import { requireAuth } from "../middlewares/auth";
import { adminLimiter, authLimiter } from "../middlewares/rate-limit";
import { validateBody } from "../middlewares/validate";
import { invalidateCache } from "../lib/ttl-cache";
import { logger } from "../lib/logger";

// ── Input validation schemas (Part 8 security hardening) ────────────────────
// These guard the free-text/rich-content write routes (blog, roadmap,
// announcements, contact replies) against malformed or oversized payloads
// before they reach the DB layer. Routes that only accept a fixed whitelist
// of known setting keys (content, social-links) already validate that way
// and don't need a schema on top.

const blogCreateSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().max(200_000).optional(),
  coverImageUrl: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return null;
      if (typeof v === "string") {
        // Accept only well-formed absolute URLs; silently discard anything
        // that looks like a relative path or malformed URL so the editor
        // never hard-fails on a non-URL cover image value.
        try { new URL(v); } catch { return null; }
      }
      return v;
    },
    z.string().trim().url().max(2000).nullable().optional(),
  ),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().max(60)).max(20).optional(),
  seoTitle: z.string().trim().max(300).nullable().optional(),
  seoDescription: z.string().trim().max(500).nullable().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});
const blogUpdateSchema = blogCreateSchema.partial();

const contactUpdateSchema = z.object({
  status: z.enum(["new", "read", "replied", "archived"]).optional(),
  adminReply: z.string().trim().min(1).max(5000).optional(),
}).refine((v) => v.status !== undefined || v.adminReply !== undefined, {
  message: "Nothing to update",
});

const roadmapCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["planned", "in_progress", "completed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  targetDate: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.number().int().optional(),
  items: z.array(z.string().trim().max(300)).max(50).optional(),
});
const roadmapUpdateSchema = roadmapCreateSchema.partial();

const announcementCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(1000),
  type: z.enum(["banner", "modal", "toast"]).optional(),
  isActive: z.boolean().optional(),
  isDismissible: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  ctaLabel: z.string().trim().max(60).nullable().optional(),
  ctaUrl: z.string().trim().url().max(2000).nullable().optional(),
});
const announcementUpdateSchema = announcementCreateSchema.partial();

const router: IRouter = Router();
router.use(adminLimiter);

// ── helpers ───────────────────────────────────────────────────────────────────

async function writeAdminLog(
  adminTelegramId: string,
  action: string,
  targetTelegramId?: string,
  details?: string,
) {
  await db.insert(adminLogsTable).values({
    adminTelegramId,
    action,
    targetTelegramId,
    details: details ?? null,
  });
}

function hashPassword(password: string, salt: string): string {
  return crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
}

const DEFAULT_ADMIN_SALT = "hustlecoin_website_admin_2025";
const DEFAULT_ADMIN_PASSWORD = "HustleCoin2025!";
const DEFAULT_ADMIN_HASH = hashPassword(DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_SALT);

async function getSetting(key: string): Promise<string> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key))
    .limit(1);
  return row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
}

async function upsertSetting(key: string, value: string, adminTelegramId?: string) {
  await db
    .insert(systemSettingsTable)
    .values({ key, value, updatedByTelegramId: adminTelegramId })
    .onConflictDoUpdate({
      target: systemSettingsTable.key,
      set: { value, updatedAt: new Date(), updatedByTelegramId: adminTelegramId },
    });
}

// ── Website Admin Auth (NO requireAdmin guard) ────────────────────────────────

// POST /admin/website-auth/login
router.post(
  "/admin/website-auth/login",
  authLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId, password } = req.body as {
      telegramId?: string;
      password?: string;
    };

    if (!telegramId?.trim() || !password) {
      res.status(400).json({ error: "telegramId and password required" });
      return;
    }

    // Look up admin user
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId.trim()))
      .limit(1);

    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    // Verify password
    const storedHash = await getSetting(SETTING_KEYS.ADMIN_WEBSITE_PASSWORD_HASH);
    const candidateHash = hashPassword(password, DEFAULT_ADMIN_SALT);

    const validHash = storedHash || DEFAULT_ADMIN_HASH;
    if (candidateHash !== validHash) {
      res.status(403).json({ error: "Invalid credentials" });
      return;
    }

    // Security: the fallback password is a fixed value shipped in the
    // (public) repo. It's fine for first-run bootstrap, but logging in with
    // it in production means the account hasn't been secured yet — flag it
    // loudly so it doesn't go unnoticed. Use POST /admin/website-auth/set-password
    // to set a real one.
    if (!storedHash && process.env.NODE_ENV === "production") {
      logger.warn(
        { telegramId: user.telegramId },
        "SECURITY: website admin logged in using the default fallback password — set a real password via /admin/website-auth/set-password",
      );
    }

    req.session.userId = user.id;

    await writeAdminLog(user.telegramId, "website_admin_login", undefined, `ip=${req.ip}`);

    // Explicitly save before responding — same race as Telegram auth: the
    // session cookie reaches the browser before the PG write completes, so the
    // immediately-following GET /admin/website-auth/me would 401 without this.
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ err: saveErr }, "Failed to save admin session after login");
        res.status(500).json({ error: "Session save failed" });
        return;
      }
      res.json({
        success: true,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          isAdmin: user.isAdmin,
        },
      });
    });
  },
);

// GET /admin/website-auth/me
router.get(
  "/admin/website-auth/me",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AdminRequest).currentUser;
    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        isAdmin: user.isAdmin,
      },
    });
  },
);

// POST /admin/website-auth/set-password
router.post(
  "/admin/website-auth/set-password",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { password } = req.body as { password?: string };

    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const newHash = hashPassword(password, DEFAULT_ADMIN_SALT);
    await upsertSetting(SETTING_KEYS.ADMIN_WEBSITE_PASSWORD_HASH, newHash, admin.telegramId);
    await writeAdminLog(admin.telegramId, "change_website_admin_password");

    res.json({ success: true });
  },
);

// POST /admin/website-auth/logout
router.post(
  "/admin/website-auth/logout",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    req.session.destroy(() => {});
    res.json({ success: true });
  },
);

// ── Extended User Management ──────────────────────────────────────────────────

// DELETE /admin/users/:telegramId
router.delete(
  "/admin/users/:telegramId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    if (telegramId === admin.telegramId) {
      res.status(400).json({ error: "Cannot delete yourself" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.isAdmin) {
      res.status(403).json({ error: "Cannot delete an admin account" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.telegramId, telegramId));
    await writeAdminLog(admin.telegramId, "delete_user", telegramId);
    res.json({ success: true });
  },
);

// PATCH /admin/users/:telegramId — edit username / level
router.patch(
  "/admin/users/:telegramId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };
    const { username, level } = req.body as Partial<{ username: string; level: number }>;

    if (username === undefined && level === undefined) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    const updates: Partial<typeof usersTable.$inferSelect> = {};
    if (username !== undefined) (updates as Record<string, unknown>)["username"] = username.trim() || null;
    if (level !== undefined) {
      if (!Number.isInteger(level) || level < 1 || level > 100) {
        res.status(400).json({ error: "level must be 1–100" });
        return;
      }
      updates.level = level;
    }

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.telegramId, telegramId))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await writeAdminLog(
      admin.telegramId,
      "edit_user",
      telegramId,
      JSON.stringify({ username, level }),
    );
    res.json({ success: true, user });
  },
);

// POST /admin/users/:telegramId/reset/mining — clear active mining session
router.post(
  "/admin/users/:telegramId/reset/mining",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    await db
      .update(usersTable)
      .set({ miningSessionStart: null, lastMine: null })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "reset_mining", telegramId);
    res.json({ success: true });
  },
);

// GET /admin/users/:telegramId/referral-tree
router.get(
  "/admin/users/:telegramId/referral-tree",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId } = req.params as { telegramId: string };

    // Direct referrals made by this user
    const directReferrals = await db
      .select({
        refereeId: referralsTable.refereeTelegramId,
        hpEarned: referralsTable.referrerHpEarned,
        createdAt: referralsTable.createdAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
        balance: usersTable.balance,
      })
      .from(referralsTable)
      .leftJoin(usersTable, eq(referralsTable.refereeTelegramId, usersTable.telegramId))
      .where(eq(referralsTable.referrerTelegramId, telegramId))
      .orderBy(desc(referralsTable.createdAt))
      .limit(100);

    // Who referred this user
    const [referredBy] = await db
      .select({
        referrerTelegramId: referralsTable.referrerTelegramId,
        hpEarned: referralsTable.refereeHpEarned,
        createdAt: referralsTable.createdAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
      })
      .from(referralsTable)
      .leftJoin(usersTable, eq(referralsTable.referrerTelegramId, usersTable.telegramId))
      .where(eq(referralsTable.refereeTelegramId, telegramId))
      .limit(1);

    res.json({
      referredBy: referredBy ?? null,
      directReferrals,
      totalReferrals: directReferrals.length,
    });
  },
);

// GET /admin/users/:telegramId/achievements
router.get(
  "/admin/users/:telegramId/achievements",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId } = req.params as { telegramId: string };

    const unlocks = await db
      .select({
        id: achievementsTable.id,
        title: achievementsTable.title,
        description: achievementsTable.description,
        icon: achievementsTable.icon,
        unlockedAt: achievementUnlocksTable.unlockedAt,
      })
      .from(achievementUnlocksTable)
      .innerJoin(achievementsTable, eq(achievementUnlocksTable.achievementId, achievementsTable.id))
      .where(eq(achievementUnlocksTable.telegramId, telegramId))
      .orderBy(desc(achievementUnlocksTable.unlockedAt));

    res.json({ achievements: unlocks });
  },
);

// GET /admin/users/:telegramId/wallet
router.get(
  "/admin/users/:telegramId/wallet",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId } = req.params as { telegramId: string };
    const { limit: limitStr = "50", offset: offsetStr = "0" } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr, 10) || 50, 200);
    const offset = parseInt(offsetStr, 10) || 0;

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.telegramId, telegramId))
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(transactionsTable)
        .where(eq(transactionsTable.telegramId, telegramId)),
    ]);

    res.json({ transactions, total, limit, offset });
  },
);

// GET /admin/users/:telegramId/activity
router.get(
  "/admin/users/:telegramId/activity",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId } = req.params as { telegramId: string };
    const { limit: limitStr = "50" } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr, 10) || 50, 200);

    const [mines, tasksDone, questsDone, notifs] = await Promise.all([
      db
        .select()
        .from(miningLogsTable)
        .where(eq(miningLogsTable.telegramId, telegramId))
        .orderBy(desc(miningLogsTable.minedAt))
        .limit(limit),
      db
        .select()
        .from(taskCompletionsTable)
        .where(eq(taskCompletionsTable.telegramId, telegramId))
        .orderBy(desc(taskCompletionsTable.completedAt))
        .limit(limit),
      db
        .select()
        .from(questProgressTable)
        .where(eq(questProgressTable.telegramId, telegramId))
        .orderBy(desc(questProgressTable.updatedAt))
        .limit(limit),
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.telegramId, telegramId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit),
    ]);

    res.json({ mines, tasks: tasksDone, quests: questsDone, notifications: notifs });
  },
);

// ── Admin Logs ────────────────────────────────────────────────────────────────

// GET /admin/logs
router.get(
  "/admin/logs",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { limit: limitStr = "50", offset: offsetStr = "0" } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr, 10) || 50, 200);
    const offset = parseInt(offsetStr, 10) || 0;

    const [logs, [{ total }]] = await Promise.all([
      db
        .select()
        .from(adminLogsTable)
        .orderBy(desc(adminLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(adminLogsTable),
    ]);

    res.json({ logs, total, limit, offset });
  },
);

// ── Blog CMS ──────────────────────────────────────────────────────────────────

// GET /admin/blog
router.get(
  "/admin/blog",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      limit: limitStr = "20",
      offset: offsetStr = "0",
      status,
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 20, 100);
    const offset = parseInt(offsetStr, 10) || 0;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status === "published") {
      conditions.push(eq(blogPostsTable.isPublished, true) as ReturnType<typeof eq>);
    } else if (status === "draft") {
      conditions.push(eq(blogPostsTable.isPublished, false) as ReturnType<typeof eq>);
    }

    const [posts, [{ total }]] = await Promise.all([
      db
        .select()
        .from(blogPostsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(blogPostsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(blogPostsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    res.json({ posts, total, limit, offset });
  },
);

// GET /admin/blog/:id
router.get(
  "/admin/blog/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [post] = await db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.id, id))
      .limit(1);

    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    res.json({ post });
  },
);

// POST /admin/blog
router.post(
  "/admin/blog",
  requireAdmin,
  validateBody(blogCreateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const {
      slug, title, excerpt, content, coverImageUrl, category, tags,
      seoTitle, seoDescription, isPublished, isFeatured, publishedAt, scheduledFor,
    } = req.body as z.infer<typeof blogCreateSchema>;

    const [post] = await db
      .insert(blogPostsTable)
      .values({
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        title: title.trim(),
        excerpt: excerpt?.trim() ?? "",
        content: content ?? "",
        coverImageUrl: coverImageUrl ?? null,
        category: category ?? "general",
        tags: tags ?? [],
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        authorTelegramId: admin.telegramId,
        isPublished: isPublished ?? false,
        isFeatured: isFeatured ?? false,
        publishedAt: publishedAt ? new Date(publishedAt) : (isPublished ? new Date() : null),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      })
      .returning();

    await writeAdminLog(admin.telegramId, "create_blog_post", undefined, `id=${post!.id}`);
    res.status(201).json({ post });
  },
);

// PUT /admin/blog/:id
router.put(
  "/admin/blog/:id",
  requireAdmin,
  validateBody(blogUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const body = req.body as z.infer<typeof blogUpdateSchema>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.slug !== undefined) updates["slug"] = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (body.title !== undefined) updates["title"] = body.title.trim();
    if (body.excerpt !== undefined) updates["excerpt"] = body.excerpt.trim();
    if (body.content !== undefined) updates["content"] = body.content;
    if (body.coverImageUrl !== undefined) updates["coverImageUrl"] = body.coverImageUrl;
    if (body.category !== undefined) updates["category"] = body.category;
    if (body.tags !== undefined) updates["tags"] = body.tags;
    if (body.seoTitle !== undefined) updates["seoTitle"] = body.seoTitle;
    if (body.seoDescription !== undefined) updates["seoDescription"] = body.seoDescription;
    if (body.isPublished !== undefined) {
      updates["isPublished"] = body.isPublished;
      if (body.isPublished && body.publishedAt === undefined) {
        updates["publishedAt"] = new Date();
      }
    }
    if (body.isFeatured !== undefined) updates["isFeatured"] = body.isFeatured;
    if (body.publishedAt !== undefined) updates["publishedAt"] = body.publishedAt ? new Date(body.publishedAt) : null;
    if (body.scheduledFor !== undefined) updates["scheduledFor"] = body.scheduledFor ? new Date(body.scheduledFor) : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [post] = await db
      .update(blogPostsTable)
      .set(updates as any)
      .where(eq(blogPostsTable.id, id))
      .returning();

    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    await writeAdminLog(admin.telegramId, "edit_blog_post", undefined, `id=${id}`);
    res.json({ post });
  },
);

// DELETE /admin/blog/:id
router.delete(
  "/admin/blog/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
    await writeAdminLog(admin.telegramId, "delete_blog_post", undefined, `id=${id}`);
    res.json({ success: true });
  },
);

// ── Contact Messages ──────────────────────────────────────────────────────────

// GET /admin/contact
router.get(
  "/admin/contact",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      status,
      limit: limitStr = "30",
      offset: offsetStr = "0",
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 30, 100);
    const offset = parseInt(offsetStr, 10) || 0;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) {
      conditions.push(eq(contactMessagesTable.status, status) as ReturnType<typeof eq>);
    }

    const [messages, [{ total }]] = await Promise.all([
      db
        .select()
        .from(contactMessagesTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contactMessagesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(contactMessagesTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    res.json({ messages, total, limit, offset });
  },
);

// PATCH /admin/contact/:id
router.patch(
  "/admin/contact/:id",
  requireAdmin,
  validateBody(contactUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status, adminReply } = req.body as z.infer<typeof contactUpdateSchema>;

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates["status"] = status;
    if (adminReply !== undefined) {
      updates["adminReply"] = adminReply;
      updates["repliedAt"] = new Date();
      updates["status"] = "replied";
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nothing to update" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [msg] = await db
      .update(contactMessagesTable)
      .set(updates as any)
      .where(eq(contactMessagesTable.id, id))
      .returning();

    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    await writeAdminLog(admin.telegramId, "update_contact_message", undefined, `id=${id} status=${status}`);
    res.json({ message: msg });
  },
);

// DELETE /admin/contact/:id
router.delete(
  "/admin/contact/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id));
    await writeAdminLog(admin.telegramId, "delete_contact_message", undefined, `id=${id}`);
    res.json({ success: true });
  },
);

// ── Roadmap Phases ────────────────────────────────────────────────────────────

// GET /admin/roadmap
router.get(
  "/admin/roadmap",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const phases = await db
      .select()
      .from(roadmapPhasesTable)
      .orderBy(asc(roadmapPhasesTable.sortOrder), asc(roadmapPhasesTable.id));
    res.json({ phases });
  },
);

// POST /admin/roadmap
router.post(
  "/admin/roadmap",
  requireAdmin,
  validateBody(roadmapCreateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { title, description, status, progress, targetDate, sortOrder, items } =
      req.body as z.infer<typeof roadmapCreateSchema>;

    const [phase] = await db
      .insert(roadmapPhasesTable)
      .values({
        title: title.trim(),
        description: description?.trim() ?? "",
        status: status ?? "planned",
        progress: progress ?? 0,
        targetDate: targetDate ?? null,
        sortOrder: sortOrder ?? 0,
        items: items ?? [],
      })
      .returning();

    invalidateCache("public:roadmap");
    await writeAdminLog(admin.telegramId, "create_roadmap_phase", undefined, `id=${phase!.id}`);
    res.status(201).json({ phase });
  },
);

// PUT /admin/roadmap/:id
router.put(
  "/admin/roadmap/:id",
  requireAdmin,
  validateBody(roadmapUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const body = req.body as z.infer<typeof roadmapUpdateSchema>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates["title"] = body.title.trim();
    if (body.description !== undefined) updates["description"] = body.description.trim();
    if (body.status !== undefined) updates["status"] = body.status;
    if (body.progress !== undefined) updates["progress"] = Math.max(0, Math.min(100, body.progress));
    if (body.targetDate !== undefined) updates["targetDate"] = body.targetDate;
    if (body.sortOrder !== undefined) updates["sortOrder"] = body.sortOrder;
    if (body.items !== undefined) updates["items"] = body.items;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [phase] = await db
      .update(roadmapPhasesTable)
      .set(updates as any)
      .where(eq(roadmapPhasesTable.id, id))
      .returning();

    if (!phase) { res.status(404).json({ error: "Phase not found" }); return; }
    invalidateCache("public:roadmap");
    await writeAdminLog(admin.telegramId, "edit_roadmap_phase", undefined, `id=${id}`);
    res.json({ phase });
  },
);

// DELETE /admin/roadmap/:id
router.delete(
  "/admin/roadmap/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(roadmapPhasesTable).where(eq(roadmapPhasesTable.id, id));
    invalidateCache("public:roadmap");
    await writeAdminLog(admin.telegramId, "delete_roadmap_phase", undefined, `id=${id}`);
    res.json({ success: true });
  },
);

// ── Website Announcements ─────────────────────────────────────────────────────

// GET /admin/website-announcements
router.get(
  "/admin/website-announcements",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const items = await db
      .select()
      .from(websiteAnnouncementsTable)
      .orderBy(desc(websiteAnnouncementsTable.createdAt));
    res.json({ announcements: items });
  },
);

// POST /admin/website-announcements
router.post(
  "/admin/website-announcements",
  requireAdmin,
  validateBody(announcementCreateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const {
      title, message, type, isActive, isDismissible,
      expiresAt, ctaLabel, ctaUrl,
    } = req.body as z.infer<typeof announcementCreateSchema>;

    const [item] = await db
      .insert(websiteAnnouncementsTable)
      .values({
        title: title.trim(),
        message: message.trim(),
        type: type ?? "banner",
        isActive: isActive ?? true,
        isDismissible: isDismissible ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        ctaLabel: ctaLabel ?? null,
        ctaUrl: ctaUrl ?? null,
        createdByTelegramId: admin.telegramId,
      })
      .returning();

    invalidateCache("public:announcements");
    await writeAdminLog(admin.telegramId, "create_website_announcement", undefined, `id=${item!.id}`);
    res.status(201).json({ announcement: item });
  },
);

// PUT /admin/website-announcements/:id
router.put(
  "/admin/website-announcements/:id",
  requireAdmin,
  validateBody(announcementUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const body = req.body as z.infer<typeof announcementUpdateSchema>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates["title"] = body.title.trim();
    if (body.message !== undefined) updates["message"] = body.message.trim();
    if (body.type !== undefined) updates["type"] = body.type;
    if (body.isActive !== undefined) updates["isActive"] = body.isActive;
    if (body.isDismissible !== undefined) updates["isDismissible"] = body.isDismissible;
    if (body.expiresAt !== undefined) updates["expiresAt"] = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.ctaLabel !== undefined) updates["ctaLabel"] = body.ctaLabel;
    if (body.ctaUrl !== undefined) updates["ctaUrl"] = body.ctaUrl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [item] = await db
      .update(websiteAnnouncementsTable)
      .set(updates as any)
      .where(eq(websiteAnnouncementsTable.id, id))
      .returning();

    if (!item) { res.status(404).json({ error: "Announcement not found" }); return; }
    invalidateCache("public:announcements");
    await writeAdminLog(admin.telegramId, "edit_website_announcement", undefined, `id=${id}`);
    res.json({ announcement: item });
  },
);

// DELETE /admin/website-announcements/:id
router.delete(
  "/admin/website-announcements/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const id = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    await db.delete(websiteAnnouncementsTable).where(eq(websiteAnnouncementsTable.id, id));
    invalidateCache("public:announcements");
    await writeAdminLog(admin.telegramId, "delete_website_announcement", undefined, `id=${id}`);
    res.json({ success: true });
  },
);

// ── Content Management ────────────────────────────────────────────────────────

const CONTENT_KEYS = [
  SETTING_KEYS.CONTENT_HERO_BADGE,
  SETTING_KEYS.CONTENT_HERO_TITLE,
  SETTING_KEYS.CONTENT_HERO_SUBTITLE,
  SETTING_KEYS.CONTENT_HERO_CTA_PRIMARY,
  SETTING_KEYS.CONTENT_HERO_CTA_SECONDARY,
  SETTING_KEYS.CONTENT_ABOUT_HEADLINE,
  SETTING_KEYS.CONTENT_ABOUT_BODY,
  SETTING_KEYS.CONTENT_FOOTER_TAGLINE,
  SETTING_KEYS.CONTENT_CONTACT_EMAIL,
  SETTING_KEYS.CONTENT_CONTACT_NOTE,
];

// GET /admin/content
router.get(
  "/admin/content",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.select().from(systemSettingsTable);
    const content: Record<string, string> = {};
    for (const key of CONTENT_KEYS) {
      const row = rows.find((r) => r.key === key);
      content[key] = row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
    }
    res.json({ content });
  },
);

// PUT /admin/content
router.put(
  "/admin/content",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const updates = req.body as Record<string, string>;
    const validKeys = CONTENT_KEYS as readonly string[];
    const toUpdate = Object.entries(updates).filter(([k]) => validKeys.includes(k));

    if (toUpdate.length === 0) {
      res.status(400).json({ error: "No valid content keys provided" });
      return;
    }

    for (const [key, value] of toUpdate) {
      await db
        .insert(systemSettingsTable)
        .values({ key, value: String(value), updatedByTelegramId: admin.telegramId })
        .onConflictDoUpdate({
          target: systemSettingsTable.key,
          set: { value: String(value), updatedAt: new Date(), updatedByTelegramId: admin.telegramId },
        });
    }

    invalidateCache("public:content");
    await writeAdminLog(
      admin.telegramId,
      "update_content",
      undefined,
      `keys=${toUpdate.map(([k]) => k).join(",")}`,
    );
    res.json({ success: true, updated: toUpdate.length });
  },
);

// ── Social Links ──────────────────────────────────────────────────────────────

const SOCIAL_KEYS = [
  SETTING_KEYS.SOCIAL_TELEGRAM,
  SETTING_KEYS.SOCIAL_TWITTER,
  SETTING_KEYS.SOCIAL_DISCORD,
  SETTING_KEYS.SOCIAL_INSTAGRAM,
  SETTING_KEYS.SOCIAL_TIKTOK,
  SETTING_KEYS.SOCIAL_YOUTUBE,
  SETTING_KEYS.SOCIAL_MEDIUM,
  SETTING_KEYS.SOCIAL_GITHUB,
];

// GET /admin/social-links
router.get(
  "/admin/social-links",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.select().from(systemSettingsTable);
    const links: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) {
      const row = rows.find((r) => r.key === key);
      links[key] = row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
    }
    res.json({ links });
  },
);

// PUT /admin/social-links
router.put(
  "/admin/social-links",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const updates = req.body as Record<string, string>;
    const validKeys = SOCIAL_KEYS as readonly string[];
    const toUpdate = Object.entries(updates).filter(([k]) => validKeys.includes(k));

    if (toUpdate.length === 0) {
      res.status(400).json({ error: "No valid social link keys provided" });
      return;
    }

    for (const [key, value] of toUpdate) {
      await db
        .insert(systemSettingsTable)
        .values({ key, value: String(value), updatedByTelegramId: admin.telegramId })
        .onConflictDoUpdate({
          target: systemSettingsTable.key,
          set: { value: String(value), updatedAt: new Date(), updatedByTelegramId: admin.telegramId },
        });
    }

    invalidateCache("public:social-links");
    await writeAdminLog(
      admin.telegramId,
      "update_social_links",
      undefined,
      `keys=${toUpdate.map(([k]) => k).join(",")}`,
    );
    res.json({ success: true, updated: toUpdate.length });
  },
);

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /admin/analytics
router.get(
  "/admin/analytics",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { period = "7d" } = req.query as { period?: string };

    const days = period === "30d" ? 30 : period === "1d" ? 1 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      [{ total }],
      byDay,
      byPath,
      byDevice,
    ] = await Promise.all([
      // Total views
      db
        .select({ total: count() })
        .from(siteAnalyticsTable)
        .where(gte(siteAnalyticsTable.createdAt, since)),
      // Views by day
      db
        .select({
          day: sql<string>`date_trunc('day', ${siteAnalyticsTable.createdAt})::date::text`,
          views: count(),
        })
        .from(siteAnalyticsTable)
        .where(gte(siteAnalyticsTable.createdAt, since))
        .groupBy(sql`date_trunc('day', ${siteAnalyticsTable.createdAt})`)
        .orderBy(sql`date_trunc('day', ${siteAnalyticsTable.createdAt})`),
      // Top pages
      db
        .select({
          path: siteAnalyticsTable.path,
          views: count(),
        })
        .from(siteAnalyticsTable)
        .where(gte(siteAnalyticsTable.createdAt, since))
        .groupBy(siteAnalyticsTable.path)
        .orderBy(desc(count()))
        .limit(10),
      // By device
      db
        .select({
          deviceType: siteAnalyticsTable.deviceType,
          views: count(),
        })
        .from(siteAnalyticsTable)
        .where(gte(siteAnalyticsTable.createdAt, since))
        .groupBy(siteAnalyticsTable.deviceType),
    ]);

    res.json({
      period,
      totalViews: total,
      byDay,
      topPages: byPath,
      byDevice,
    });
  },
);

export default router;
