import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  /** Extra JSON-LD structured data blocks, e.g. FAQPage, Article, BreadcrumbList. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const SITE_URL = "https://hustlecoin.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * Per-page SEO/social metadata. index.html carries sensible site-wide
 * defaults for the root URL and for crawlers/link-unfurlers that don't
 * execute JavaScript; this component overrides them per-route for
 * JS-rendering crawlers (Googlebot, most AI assistants) and keeps
 * document.title in sync with the current page.
 *
 * Known limitation: this is a client-rendered SPA, so social platforms that
 * don't execute JS (e.g. Facebook/Twitter link previews, some Telegram
 * unfurls) will always see the static tags baked into index.html rather
 * than these per-page ones. Fixing that fully requires SSR/prerendering,
 * which is a larger architectural change out of scope here.
 */
export function Seo({ title, description, path, image, type = "website", jsonLd, noindex }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_IMAGE;
  const jsonLdBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="HustleCoin" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdBlocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
