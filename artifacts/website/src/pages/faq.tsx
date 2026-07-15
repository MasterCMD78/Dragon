import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Seo } from "@/components/Seo";

const faqs = [
  {
    q: "What is HustleCoin (HSL)?",
    a: "HustleCoin is a Telegram Mini App that gamifies consistency and effort. Users mine HP (Hustle Points) daily, build streaks, complete tasks, and climb leaderboards within a premium, dark-mode interface."
  },
  {
    q: "How do I start mining?",
    a: "Simply click 'Open App' on this site to launch the HustleCoin bot in Telegram. No downloads or complex wallet setups are required to begin."
  },
  {
    q: "What are HP (Hustle Points)?",
    a: "HP represents your earned value within the app. It is generated through daily check-ins, maintaining streaks, referring friends, and completing quests. HP determines your leaderboard rank and future ecosystem benefits."
  },
  {
    q: "How does the streak system work?",
    a: "Every consecutive day you log in and mine, your streak increases. Higher streaks apply a multiplier to your base mining rate. If you miss a day, your streak resets, so consistency is key."
  },
  {
    q: "Is there a token launch (Airdrop)?",
    a: "We are currently in the Growth phase (Phase 2). Tokenomics and TGE (Token Generation Event) details are slated for Phase 4 of our roadmap. Focus on accumulating HP and building your network now."
  },
  {
    q: "Can I use multiple accounts?",
    a: "No. Our anti-cheat mechanics actively monitor for bot networks and sybil attacks. Using multiple accounts to artificially boost referrals will result in all associated accounts being banned and HP wiped."
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="FAQ | HustleCoin"
        description="Answers to common questions about HustleCoin: mining HP, streaks, referrals, the token launch, and anti-bot protections."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Everything you need to know about mining, mechanics, and the future of HustleCoin.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className={`border border-white/10 rounded-2xl overflow-hidden transition-colors ${openIndex === i ? 'bg-card border-primary/30' : 'bg-black hover:border-white/20'}`}
              >
                <button
                  className="w-full text-left px-6 py-6 flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="font-heading font-medium text-lg pr-8">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ${openIndex === i ? 'rotate-180 text-primary' : ''}`} />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
          
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <a
              href="https://t.me/HustleCoinMinerBot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-white transition-colors font-medium border-b border-primary/30 pb-1"
            >
              Ask in our Telegram Community
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}