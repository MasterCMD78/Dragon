import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DocsNavItem {
  href: string;
  label: string;
}

export const docsNav: DocsNavItem[] = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/what-is-hustlecoin", label: "What is HustleCoin" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/mining-guide", label: "Mining Guide" },
  { href: "/docs/referral-guide", label: "Referral Guide" },
  { href: "/docs/achievements", label: "Achievements" },
  { href: "/docs/tokenomics", label: "Tokenomics" },
  { href: "/docs/roadmap", label: "Roadmap" },
  { href: "/docs/faq", label: "FAQ" },
  { href: "/docs/whitepaper", label: "Whitepaper" },
];

interface DocsLayoutProps {
  children: ReactNode;
}

/**
 * Shared shell for every /docs/* page: a sticky sidebar of all doc sections
 * on desktop, collapsing to a slide-down menu on mobile. Sits inside the
 * global <Layout> (Navbar/Footer already rendered by the router).
 */
export function DocsLayout({ children }: DocsLayoutProps) {
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex flex-col w-full pb-20">
      <div className="container mx-auto px-4 md:px-6 pt-8">
        {/* Mobile section toggle */}
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          className="lg:hidden w-full flex items-center justify-between rounded-xl border border-white/10 bg-card px-4 py-3 mb-6 text-sm font-medium"
          aria-expanded={mobileNavOpen}
          aria-controls="docs-mobile-nav"
        >
          <span>
            Docs:{" "}
            <span className="text-primary">
              {docsNav.find((d) => d.href === location)?.label ?? "Overview"}
            </span>
          </span>
          {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.nav
              id="docs-mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden mb-6"
            >
              <ul className="flex flex-col gap-1 rounded-xl border border-white/10 bg-card p-2">
                {docsNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        location === item.href
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="flex gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-muted-foreground mb-4 px-3">
                Documentation
              </p>
              <nav>
                <ul className="space-y-1">
                  {docsNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          location === item.href
                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-l-2 border-transparent"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 max-w-3xl">{children}</main>
        </div>
      </div>
    </div>
  );
}
