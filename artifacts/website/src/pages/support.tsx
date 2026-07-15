import { motion } from "framer-motion";
import { Link } from "wouter";
import { MessageCircle, Mail, BookOpen, HelpCircle } from "lucide-react";
import { Seo } from "@/components/Seo";

const channels = [
  {
    icon: MessageCircle,
    title: "Telegram Community",
    desc: "The fastest way to get help. Ask questions and report issues directly to the community and team.",
    href: "https://t.me/HustleCoinMinerBot",
    external: true,
    cta: "Join Group",
  },
  {
    icon: Mail,
    title: "Contact Form",
    desc: "For formal inquiries, partnerships, or account issues you'd rather not raise in the public group.",
    href: "/contact",
    external: false,
    cta: "Contact Us",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "Learn how mining, streaks, referrals, quests, and leaderboards work before reaching out.",
    href: "/documentation",
    external: false,
    cta: "Read Docs",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    desc: "Answers to the most common questions about HustleCoin, HP, and the roadmap.",
    href: "/faq",
    external: false,
    cta: "View FAQ",
  },
];

export default function Support() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Support | HustleCoin"
        description="Get help with HustleCoin through our Telegram community, contact form, documentation, and FAQ."
        path="/support"
      />
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6 text-center">
        <div className="container mx-auto max-w-3xl">
          <motion.h1
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Support
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Need help? Pick the channel that fits your question.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-5xl grid md:grid-cols-2 gap-6">
          {channels.map((c, i) => {
            const Card = (
              <motion.div
                className="bg-card border border-white/5 p-8 rounded-2xl hover:border-primary/30 transition-all duration-300 h-full"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-12 h-12 bg-black border border-white/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <c.icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-heading font-bold mb-2">{c.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{c.desc}</p>
                <span className="font-medium text-primary flex items-center gap-2">{c.cta} &rarr;</span>
              </motion.div>
            );
            return c.external ? (
              <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" className="block">
                {Card}
              </a>
            ) : (
              <Link key={c.title} href={c.href} className="block">
                {Card}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
