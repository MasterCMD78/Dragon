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
import { z } from "zod";
import { validateBody } from "../middlewares/validate";
import { cached } from "../lib/ttl-cache";

const router: IRouter = Router();

// Short TTLs on public read-heavy content the website/Mini App polls
// frequently (stats ticker, announcements banner, blog/roadmap listings).
// These change rarely relative to how often they're fetched, so caching
// cuts DB load without users perceiving staleness.
const STATS_TTL_MS = 15_000;
const CONTENT_TTL_MS = 30_000;

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
    const stats = await cached("public:stats", STATS_TTL_MS, async () => {
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

      return {
        totalUsers,
        totalHP: Number(totalHP),
        totalMines,
        totalReferrals,
        totalQuests,
        onlineUsers,
      };
    });

    res.set("Cache-Control", "public, max-age=15").json(stats);
  },
);

// ── GET /public/announcements ─────────────────────────────────────────────────

router.get(
  "/public/announcements",
  async (_req: Request, res: Response): Promise<void> => {
    const items = await cached("public:announcements", CONTENT_TTL_MS, async () => {
      const now = new Date();
      return db
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
    });

    res.set("Cache-Control", "public, max-age=30").json({ announcements: items });
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

    const cacheKey = `public:blog:${category ?? ""}:${featured ?? ""}:${limit}:${offset}`;
    const { posts, total } = await cached(cacheKey, CONTENT_TTL_MS, async () => {
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
      return { posts, total: Number(total) };
    });

    res.set("Cache-Control", "public, max-age=30").json({ posts, total, limit, offset });
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

    // Increment view count — must subscribe (.catch) to trigger Drizzle's lazy execution
    db.update(blogPostsTable)
      .set({ viewCount: sql`${blogPostsTable.viewCount} + 1` })
      .where(eq(blogPostsTable.id, post.id))
      .catch((err) => req.log.error({ err }, "blog view-count increment failed"));

    res.json({ post });
  },
);

// ── GET /public/roadmap ───────────────────────────────────────────────────────

router.get(
  "/public/roadmap",
  async (_req: Request, res: Response): Promise<void> => {
    const phases = await cached("public:roadmap", CONTENT_TTL_MS, () =>
      db
        .select()
        .from(roadmapPhasesTable)
        .orderBy(asc(roadmapPhasesTable.sortOrder), asc(roadmapPhasesTable.id)),
    );

    res.set("Cache-Control", "public, max-age=30").json({ phases });
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

    const settings = await cached("public:content", CONTENT_TTL_MS, () => getSettings(contentKeys));
    res.set("Cache-Control", "public, max-age=30").json({ content: settings });
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

    const settings = await cached("public:social-links", CONTENT_TTL_MS, () => getSettings(socialKeys));
    res.set("Cache-Control", "public, max-age=30").json({ links: settings });
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

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  subject: z.string().trim().max(300).optional(),
  message: z.string().trim().min(1).max(5000),
});

router.post(
  "/public/contact",
  validateBody(contactSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, subject, message } = req.body as z.infer<typeof contactSchema>;

    await db.insert(contactMessagesTable).values({
      name,
      email,
      subject: subject ?? "",
      message,
    });

    res.status(201).json({ success: true });
  },
);

// ── POST /public/analytics/track ─────────────────────────────────────────────

const analyticsTrackSchema = z.object({
  path: z.string().trim().min(1).max(500),
  sessionId: z.string().trim().max(100).optional(),
});

router.post(
  "/public/analytics/track",
  validateBody(analyticsTrackSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { path, sessionId } = req.body as z.infer<typeof analyticsTrackSchema>;

    const ua = req.headers["user-agent"] as string | undefined;
    const referrer = req.headers["referer"] as string | undefined;
    const deviceType = detectDevice(ua);

    // Must subscribe (.catch) to trigger Drizzle's lazy execution; void alone never runs
    db.insert(siteAnalyticsTable)
      .values({
        path: path.slice(0, 500),
        referrer: referrer?.slice(0, 500),
        deviceType,
        sessionId: sessionId?.slice(0, 100),
      })
      .catch((err) => req.log.error({ err }, "analytics insert failed"));

    res.status(204).send();
  },
);

export default router;
