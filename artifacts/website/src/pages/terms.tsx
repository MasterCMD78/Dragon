import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

const LAST_UPDATED = "July 15, 2026";

const sections = [
  {
    title: "Acceptance of Terms",
    body: `By accessing the HustleCoin website or using the HustleCoin Telegram Mini App ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.`,
  },
  {
    title: "Description of Service",
    body: `HustleCoin is a Telegram Mini App that gamifies consistent engagement through a points system (HP), streak bonuses, referrals, quests, and leaderboards. HP has no guaranteed monetary value. Any future token generation event (TGE), airdrop, or on-chain component is speculative, unannounced beyond what is stated on our roadmap, and subject to change without notice.`,
  },
  {
    title: "No Financial Advice or Guarantee",
    body: `Nothing on this website or within the Mini App constitutes financial, investment, or legal advice. We make no promises of profit, return, or future value related to HP or any potential token. Participation is at your own discretion and risk.`,
  },
  {
    title: "Account Conduct",
    body: `You agree not to use multiple accounts, automate interactions with bots or scripts, exploit bugs, or otherwise attempt to manipulate mining, streak, referral, or leaderboard mechanics. Violations may result in HP being wiped and accounts being permanently banned without notice.`,
  },
  {
    title: "Intellectual Property",
    body: `All branding, design, and content on this website and within the Mini App are the property of HustleCoin unless otherwise noted, and may not be reproduced without permission.`,
  },
  {
    title: "Service Availability",
    body: `We aim for high availability but do not guarantee uninterrupted access to the Service. Features, mechanics, and reward rates may change as the product evolves, consistent with our published roadmap.`,
  },
  {
    title: "Limitation of Liability",
    body: `The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, HustleCoin is not liable for any indirect, incidental, or consequential damages arising from your use of the Service.`,
  },
  {
    title: "Changes to These Terms",
    body: `We may revise these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.`,
  },
];

export default function Terms() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Terms of Service | HustleCoin"
        description="The terms governing your use of the HustleCoin website and Telegram Mini App."
        path="/terms"
      />
      <section className="pt-20 pb-12 md:pt-32 md:pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.h1
            className="text-4xl md:text-5xl font-heading font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Terms of Service
          </motion.h1>
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-3xl space-y-12">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-2xl font-heading font-bold mb-3">{s.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
