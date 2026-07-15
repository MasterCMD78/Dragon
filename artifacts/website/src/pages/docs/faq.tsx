import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

const faqs = [
  {
    q: "What is HustleCoin (HSL)?",
    a: "HustleCoin is a Telegram Mini App that gamifies consistency and effort. Users mine HP (Hustle Points) daily, build streaks, complete tasks, and climb leaderboards within a premium, dark-mode interface.",
  },
  {
    q: "How do I start mining?",
    a: "Open the HustleCoin bot in Telegram and launch the Mini App. Your account is created automatically from your Telegram profile — no wallet or sign-up form required.",
  },
  {
    q: "What are HP (Hustle Points)?",
    a: "HP represents your earned value within the app. It's generated through daily check-ins, maintaining streaks, referring friends, and completing quests. HP determines your leaderboard rank and future ecosystem benefits.",
  },
  {
    q: "How does the streak system work?",
    a: "Every consecutive day you log in and mine, your streak increases. Higher streaks apply a multiplier to your base mining rate. Missing a day resets your streak.",
  },
  {
    q: "Is there a token launch (Airdrop)?",
    a: "We're currently in the Growth phase (Phase 2). Tokenomics and the TGE (Token Generation Event) are planned for Phase 4 of the roadmap.",
  },
  {
    q: "Can I use multiple accounts?",
    a: "No. Anti-cheat mechanics actively monitor for bot networks and sybil attacks. Using multiple accounts to artificially boost referrals results in all associated accounts being banned and HP wiped.",
  },
  {
    q: "Is HustleCoin built on a blockchain today?",
    a: "Not yet. HustleCoin currently runs as a Telegram Mini App with an off-chain HP balance. Solana blockchain integration is part of the long-term roadmap — see the Whitepaper for details.",
  },
];

export default function FaqDoc() {
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
    <DocsLayout>
      <DocArticle
        seoTitle="FAQ | HustleCoin Docs"
        description="Answers to common questions about HustleCoin: mining HP, streaks, referrals, the token launch, and anti-bot protections."
        path="/docs/faq"
        title="Frequently Asked Questions"
        intro="Quick answers to the questions we hear most often. For an interactive version, visit the FAQ page."
        jsonLd={faqJsonLd}
      >
        {faqs.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <hr />
        <p>
          Prefer the interactive version? Visit the <Link href="/faq">FAQ page</Link>,
          or{" "}
          <a href="https://t.me/HustleCoinMinerBot" target="_blank" rel="noopener noreferrer">
            ask in our Telegram Community
          </a>
          .
        </p>
      </DocArticle>
    </DocsLayout>
  );
}
