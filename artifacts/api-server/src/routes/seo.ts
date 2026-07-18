/**
 * SEO routes — served at the root level (NOT under /api) so they're
 * accessible at /sitemap.xml, /robots.txt, and /rss.xml.
 *
 * These routes are mounted in app.ts before the /api router so that they
 * take precedence at their exact paths.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { eq, and, desc, lte } from "drizzle-orm";

const router: IRouter = Router();

// Derive the canonical public site URL from environment.
// SITE_URL takes highest priority (set manually for custom domains).
// Falls back to the first Replit domain, then a sensible placeholder.
function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(",")[0]?.trim();
    if (domain) return `https://${domain}`;
  }
  return "https://hustlecoin.app";
}

// ── GET /robots.txt ───────────────────────────────────────────────────────────

router.get("/robots.txt", (_req: Request, res: Response): void => {
  const siteUrl = getSiteUrl();
  const content = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /search",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join("\n");

  res.set("Content-Type", "text/plain; charset=utf-8")
     .set("Cache-Control", "public, max-age=3600")
     .send(content);
});

// ── GET /sitemap.xml ──────────────────────────────────────────────────────────

router.get("/sitemap.xml", async (_req: Request, res: Response): Promise<void> => {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // Fetch published blog posts for dynamic URLs
  const posts = await db
    .select({
      slug: blogPostsTable.slug,
      publishedAt: blogPostsTable.publishedAt,
      updatedAt: blogPostsTable.updatedAt,
    })
    .from(blogPostsTable)
    .where(
      and(
        eq(blogPostsTable.isPublished, true),
        lte(blogPostsTable.publishedAt, now),
      ),
    )
    .orderBy(desc(blogPostsTable.publishedAt));

  const todayStr = now.toISOString().split("T")[0];

  // Static pages
  const staticUrls: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
    { loc: "/", changefreq: "weekly", priority: "1.0", lastmod: todayStr },
    { loc: "/about", changefreq: "monthly", priority: "0.8" },
    { loc: "/features", changefreq: "monthly", priority: "0.9" },
    { loc: "/roadmap", changefreq: "monthly", priority: "0.8" },
    { loc: "/faq", changefreq: "monthly", priority: "0.7" },
    { loc: "/news", changefreq: "weekly", priority: "0.8", lastmod: todayStr },
    { loc: "/documentation", changefreq: "monthly", priority: "0.7" },
    { loc: "/docs", changefreq: "weekly", priority: "0.9" },
    { loc: "/docs/what-is-hustlecoin", changefreq: "monthly", priority: "0.8" },
    { loc: "/docs/getting-started", changefreq: "monthly", priority: "0.8" },
    { loc: "/docs/mining-guide", changefreq: "monthly", priority: "0.8" },
    { loc: "/docs/referral-guide", changefreq: "monthly", priority: "0.8" },
    { loc: "/docs/achievements", changefreq: "monthly", priority: "0.7" },
    { loc: "/docs/tokenomics", changefreq: "monthly", priority: "0.8" },
    { loc: "/docs/roadmap", changefreq: "monthly", priority: "0.7" },
    { loc: "/docs/faq", changefreq: "monthly", priority: "0.7" },
    { loc: "/docs/whitepaper", changefreq: "monthly", priority: "0.9" },
    { loc: "/support", changefreq: "monthly", priority: "0.6" },
    { loc: "/contact", changefreq: "yearly", priority: "0.6" },
    { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
    { loc: "/terms", changefreq: "yearly", priority: "0.3" },
    { loc: "/cookies", changefreq: "yearly", priority: "0.3" },
  ];

  const urlEntries = [
    ...staticUrls.map(({ loc, changefreq, priority, lastmod }) => `
  <url>
    <loc>${siteUrl}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`),
    ...posts.map((p) => {
      const lastmod = (p.updatedAt || p.publishedAt)?.toISOString().split("T")[0] ?? todayStr;
      return `
  <url>
    <loc>${siteUrl}/news/${p.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    }),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8")
     .set("Cache-Control", "public, max-age=3600")
     .send(xml);
});

// ── GET /rss.xml ──────────────────────────────────────────────────────────────

router.get("/rss.xml", async (_req: Request, res: Response): Promise<void> => {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const posts = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      excerpt: blogPostsTable.excerpt,
      seoDescription: blogPostsTable.seoDescription,
      coverImageUrl: blogPostsTable.coverImageUrl,
      category: blogPostsTable.category,
      tags: blogPostsTable.tags,
      publishedAt: blogPostsTable.publishedAt,
      updatedAt: blogPostsTable.updatedAt,
    })
    .from(blogPostsTable)
    .where(
      and(
        eq(blogPostsTable.isPublished, true),
        lte(blogPostsTable.publishedAt, now),
      ),
    )
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(50);

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const items = posts
    .map((p) => {
      const pubDate = p.publishedAt ? p.publishedAt.toUTCString() : now.toUTCString();
      const description = p.seoDescription || p.excerpt || "";
      const link = `${siteUrl}/news/${p.slug}`;
      const categories = p.tags?.map((t: string) => `      <category>${escapeXml(t)}</category>`).join("\n") ?? "";
      const enclosure = p.coverImageUrl
        ? `      <enclosure url="${escapeXml(p.coverImageUrl)}" type="image/jpeg" length="0" />`
        : "";
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
${categories}${enclosure ? `\n${enclosure}` : ""}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>HustleCoin News</title>
    <link>${siteUrl}/news</link>
    <description>The latest news, updates and announcements from HustleCoin.</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/og-image.jpg</url>
      <title>HustleCoin News</title>
      <link>${siteUrl}/news</link>
    </image>
${items}
  </channel>
</rss>`;

  res.set("Content-Type", "application/rss+xml; charset=utf-8")
     .set("Cache-Control", "public, max-age=3600")
     .send(rss);
});

export default router;
