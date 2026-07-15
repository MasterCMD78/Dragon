import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  Rocket,
  Pickaxe,
  Users,
  Trophy,
  Coins,
  Map,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { DocsLayout } from "@/components/docs/DocsLayout";

const sections = [
  {
    href: "/docs/what-is-hustlecoin",
    icon: Sparkles,
    title: "What is HustleCoin",
    body: "The big picture: what HustleCoin is, who it's for, and how the ecosystem fits together.",
  },
  {
    href: "/docs/getting-started",
    icon: Rocket,
    title: "Getting Started",
    body: "Launch the Mini App in Telegram and make your first mine in under a minute.",
  },
  {
    href: "/docs/mining-guide",
    icon: Pickaxe,
    title: "Mining Guide",
    body: "How daily mining, streaks, and multipliers work under the hood.",
  },
  {
    href: "/docs/referral-guide",
    icon: Users,
    title: "Referral Guide",
    body: "Share your link, earn referral rewards, and understand the anti-abuse rules.",
  },
  {
    href: "/docs/achievements",
    icon: Trophy,
    title: "Achievements",
    body: "Milestones you can unlock across mining, referrals, and community participation.",
  },
  {
    href: "/docs/tokenomics",
    icon: Coins,
    title: "Tokenomics",
    body: "HSL supply, distribution, and the utility roadmap for the token.",
  },
  {
    href: "/docs/roadmap",
    icon: Map,
    title: "Roadmap",
    body: "Where HustleCoin is today and what's planned across upcoming phases.",
  },
  {
    href: "/docs/faq",
    icon: HelpCircle,
    title: "FAQ",
    body: "Quick answers to the questions we hear most often.",
  },
  {
    href: "/docs/whitepaper",
    icon: FileText,
    title: "Whitepaper",
    body: "The full HustleCoin whitepaper, readable online or as a downloadable PDF.",
  },
];

const docsJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "HustleCoin Documentation",
  description: "Guides and reference docs for the HustleCoin ecosystem: mining, referrals, achievements, tokenomics, roadmap, and the whitepaper.",
  url: "https://hustlecoin.app/docs",
};

export default function DocsHome() {
  return (
    <DocsLayout>
      <Seo
        title="Documentation Center | HustleCoin"
        description="Guides and reference docs for HustleCoin: what it is, how mining and referrals work, achievements, tokenomics, the roadmap, FAQ, and the full whitepaper."
        path="/docs"
        jsonLd={docsJsonLd}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-primary">
          Documentation
        </span>
        <h1 className="text-3xl md:text-5xl font-heading font-bold mt-3 mb-4">
          HustleCoin Documentation Center
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl">
          Everything you need to understand and get the most out of HustleCoin —
          from your first mine to the full tokenomics whitepaper.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map((s, i) => (
          <motion.div
            key={s.href}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={s.href}
              className="group flex flex-col h-full gap-3 rounded-2xl border border-white/10 bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <s.icon className="w-5 h-5" />
              </div>
              <h2 className="font-heading font-bold text-lg group-hover:text-primary transition-colors">
                {s.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </DocsLayout>
  );
}
