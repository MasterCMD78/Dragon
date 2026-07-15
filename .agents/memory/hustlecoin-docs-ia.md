---
name: HustleCoin website docs information architecture
description: Why /docs coexists with the older /documentation, /roadmap, /faq marketing pages instead of replacing them.
---

The website (`artifacts/website`) has a multi-page `/docs/*` Documentation
Center (overview, what-is, getting-started, mining/referral guides,
achievements, tokenomics, roadmap, FAQ, whitepaper) with its own sidebar
layout (`src/components/docs/DocsLayout.tsx` + `DocArticle.tsx`).

This was added *alongside*, not instead of, three pre-existing pages:
`/documentation` (a single-page mining/referral/streak overview),
`/roadmap`, and `/faq` (both interactive marketing pages with live
progress bars / accordions and their own JSON-LD).

**Why:** those pages have real inbound links, existing SEO equity, and
richer interactivity than a docs article needs. Retiring or merging them
would break URLs and lose that interactivity for no benefit.

**How to apply:** `/docs/roadmap` and `/docs/faq` are docs-styled
summaries that link out to the full `/roadmap` and `/faq` pages rather
than duplicating their interactive behavior. If asked to expand the docs
center further, keep this split — new docs content should link to
existing marketing pages instead of absorbing them, unless the user
explicitly asks to consolidate.

The whitepaper's source content (founder, token supply, distribution
percentages) came from an uploaded PDF (`attached_assets/0_#_HustleCoin_Whitepaper_*.pdf`)
and is now also served statically at `/whitepaper.pdf` from
`artifacts/website/public/whitepaper.pdf`. Treat the `/docs/whitepaper.tsx`
page content as the canonical HTML rendering of that PDF going forward.
