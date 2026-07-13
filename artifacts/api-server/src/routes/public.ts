import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  miningLogsTable,
  referralsTable,
  questProgressTable,
  blogPostsTable,
  contactMessagesTable,
  siteAnalyticsTable,
  roadmapPhasesTable,
  websiteAnnouncementsTable,
  systemSettingsTable,
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
  lte,
  ilike,
  or,
  count,
  isNull,
} from "drizzle-orm";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettingsTable);
  const result: Record<string, string> = {};
  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    result[key] = row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
  }
  return result;
}

function detectDevice(ua: string | undefined): string {
  if (!ua) return "unknown";
  const u = ua.toLowerCase();
  if (/mobi|android|iphone|ipad|tablet/.test(u)) {
    if (/tablet|ipad/.test(u)) return "tablet";
    return "mobile";
  }
  return "desktop";
}

// ── GET /public/stats ─────────────────────────────────────────────────────────

router.get(
  "/public/stats",
  async (_req: Request, res: Response): Promise<void> => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [
      [{ totalUsers }],
      [{ totalHP }],
      [{ totalMines }],
      [{ totalReferrals }],
      [{ totalQuests }],
      [{ onlineUsers }],
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(usersTable),
      db
        .select({ totalHP: sql<number>`coalesce(sum(balance),0)` })
        .from(usersTable),
      db.select({ totalMines: count() }).from(miningLogsTable),
      db.select({ totalReferrals: count() }).from(referralsTable),
      db
        .select({ totalQuests: count() })
        .from(questProgressTable)
        .where(eq(questProgressTable.completed, 1)),
      db
        .select({ onlineUsers: count() })
        .from(usersTable)
        .where(gte(usersTable.lastActive, fiveMinAgo)),
    ]);

    res.json({
      totalUsers,
      totalHP: Number(totalHP),
      totalMines,
      totalReferrals,
      totalQuests,
      onlineUsers,
    });
  },
);

// ── GET /public/announcements ─────────────────────────────────────────────────

router.get(
  "/public/announcements",
  async (_req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const items = await db
      .select()
      .from(websiteAnnouncementsTable)
      .where(
        and(
          eq(websiteAnnouncementsTable.isActive, true),
          or(
            isNull(websiteAnnouncementsTable.expiresAt),
            gte(websiteAnnouncementsTable.expiresAt, now),
          ),
        ),
      )
      .orderBy(desc(websiteAnnouncementsTable.createdAt));

    res.json({ announcements: items });
  },
);

// ── GET /public/blog ──────────────────────────────────────────────────────────

router.get(
  "/public/blog",
  async (req: Request, res: Response): Promise<void> => {
    const {
      category,
      limit: limitStr = "10",
      offset: offsetStr = "0",
      featured,
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 10, 50);
    const offset = parseInt(offsetStr, 10) || 0;
    const now = new Date();

    const conditions = [
      eq(blogPostsTable.isPublished, true),
      lte(blogPostsTable.publishedAt, now),
    ] as ReturnType<typeof eq>[];

    if (category) {
      conditions.push(eq(blogPostsTable.category, category) as ReturnType<typeof eq>);
    }
    if (featured === "true") {
      conditions.push(eq(blogPostsTable.isFeatured, true) as ReturnType<typeof eq>);
    }

    const [posts, [{ total }]] = await Promise.all([
      db
        .select({
          id: blogPostsTable.id,
          slug: blogPostsTable.slug,
          title: blogPostsTable.title,
          excerpt: blogPostsTable.excerpt,
          coverImageUrl: blogPostsTable.coverImageUrl,
          category: blogPostsTable.category,
          tags: blogPostsTable.tags,
          isFeatured: blogPostsTable.isFeatured,
          publishedAt: blogPostsTable.publishedAt,
          viewCount: blogPostsTable.viewCount,
        })
        .from(blogPostsTable)
        .where(and(...conditions))
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(blogPostsTable)
        .where(and(...conditions)),
    ]);

    res.json({ posts, total, limit, offset });
  },
);

// ── GET /public/blog/:slug ────────────────────────────────────────────────────

router.get(
  "/public/blog/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params as { slug: string };
    const now = new Date();

    const [post] = await db
      .select()
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.slug, slug),
          eq(blogPostsTable.isPublished, true),
          lte(blogPostsTable.publishedAt, now),
        ),
      )
      .limit(1);

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    // Increment view count async (don't await)
    void db
      .update(blogPostsTable)
      .set({ viewCount: sql`${blogPostsTable.viewCount} + 1` })
      .where(eq(blogPostsTable.id, post.id));

    res.json({ post });
  },
);

// ── GET /public/roadmap ───────────────────────────────────────────────────────

router.get(
  "/public/roadmap",
  async (_req: Request, res: Response): Promise<void> => {
    const phases = await db
      .select()
      .from(roadmapPhasesTable)
      .orderBy(asc(roadmapPhasesTable.sortOrder), asc(roadmapPhasesTable.id));

    res.json({ phases });
  },
);

// ── GET /public/content ───────────────────────────────────────────────────────

router.get(
  "/public/content",
  async (_req: Request, res: Response): Promise<void> => {
    const contentKeys = [
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

    const settings = await getSettings(contentKeys);
    res.json({ content: settings });
  },
);

// ── GET /public/social-links ──────────────────────────────────────────────────

router.get(
  "/public/social-links",
  async (_req: Request, res: Response): Promise<void> => {
    const socialKeys = [
      SETTING_KEYS.SOCIAL_TELEGRAM,
      SETTING_KEYS.SOCIAL_TWITTER,
      SETTING_KEYS.SOCIAL_DISCORD,
      SETTING_KEYS.SOCIAL_INSTAGRAM,
      SETTING_KEYS.SOCIAL_TIKTOK,
      SETTING_KEYS.SOCIAL_YOUTUBE,
      SETTING_KEYS.SOCIAL_MEDIUM,
      SETTING_KEYS.SOCIAL_GITHUB,
    ];

    const settings = await getSettings(socialKeys);
    res.json({ links: settings });
  },
);

// ── GET /public/search ────────────────────────────────────────────────────────

router.get(
  "/public/search",
  async (req: Request, res: Response): Promise<void> => {
    const { q = "" } = req.query as { q?: string };

    if (!q.trim() || q.trim().length < 2) {
      res.json({ results: [] });
      return;
    }

    const term = `%${q.trim()}%`;
    const now = new Date();

    const [posts, phases] = await Promise.all([
      db
        .select({
          id: blogPostsTable.id,
          slug: blogPostsTable.slug,
          title: blogPostsTable.title,
          excerpt: blogPostsTable.excerpt,
          category: blogPostsTable.category,
          publishedAt: blogPostsTable.publishedAt,
        })
        .from(blogPostsTable)
        .where(
          and(
            eq(blogPostsTable.isPublished, true),
            lte(blogPostsTable.publishedAt, now),
            or(
              ilike(blogPostsTable.title, term),
              ilike(blogPostsTable.excerpt, term),
              ilike(blogPostsTable.content, term),
            ),
          ),
        )
        .limit(10),
      db
        .select({
          id: roadmapPhasesTable.id,
          title: roadmapPhasesTable.title,
          description: roadmapPhasesTable.description,
          status: roadmapPhasesTable.status,
        })
        .from(roadmapPhasesTable)
        .where(
          or(
            ilike(roadmapPhasesTable.title, term),
            ilike(roadmapPhasesTable.description, term),
          ),
        )
        .limit(5),
    ]);

    const results = [
      ...posts.map((p) => ({ type: "blog" as const, ...p })),
      ...phases.map((p) => ({ type: "roadmap" as const, ...p })),
    ];

    res.json({ results, query: q.trim() });
  },
);

// ── POST /public/contact ──────────────────────────────────────────────────────

router.post(
  "/public/contact",
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, subject, message } = req.body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      res.status(400).json({ error: "name, email and message are required" });
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    await db.insert(contactMessagesTable).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() ?? "",
      message: message.trim(),
    });

    res.status(201).json({ success: true });
  },
);

// ── POST /public/analytics/track ─────────────────────────────────────────────

router.post(
  "/public/analytics/track",
  async (req: Request, res: Response): Promise<void> => {
    const { path, sessionId } = req.body as {
      path?: string;
      sessionId?: string;
    };

    if (!path) {
      res.status(400).json({ error: "path required" });
      return;
    }

    const ua = req.headers["user-agent"] as string | undefined;
    const referrer = req.headers["referer"] as string | undefined;
    const deviceType = detectDevice(ua);

    // Fire-and-forget — don't block response on insert
    void db.insert(siteAnalyticsTable).values({
      path: path.slice(0, 500),
      referrer: referrer?.slice(0, 500),
      deviceType,
      sessionId: sessionId?.slice(0, 100),
    });

    res.status(204).send();
  },
);

export default router;
