import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

const LAST_UPDATED = "July 15, 2026";

const sections = [
  {
    title: "Information We Collect",
    body: `When you use the HustleCoin Telegram Mini App, we collect the information Telegram provides to Mini Apps: your Telegram ID, username, and first/last name. We also record in-app activity necessary for the product to function — mining sessions, streaks, referrals, quest completions, and balances. Our public website collects standard analytics (page path, referrer, device type) and any information you submit voluntarily through the contact form (name, email, message).`,
  },
  {
    title: "How We Use Information",
    body: `We use this information to operate the mining, streak, referral, leaderboard, and quest systems; to prevent abuse (bot networks, sybil attacks, multi-accounting); to respond to support requests; and to improve the product through aggregate, anonymized analytics. We do not sell personal information to third parties.`,
  },
  {
    title: "Data Retention",
    body: `Account and activity data is retained for as long as your account is active. If you want your data deleted, contact us using the details below and we will remove personally identifiable information within a reasonable timeframe, subject to any records we are legally required to keep.`,
  },
  {
    title: "Data Sharing",
    body: `We do not share your personal information with third parties except where required by law, to protect the integrity of the platform (e.g. reporting fraud), or with service providers who help us operate the app (e.g. hosting and database providers) under confidentiality obligations.`,
  },
  {
    title: "Security",
    body: `We use industry-standard practices to protect stored data, including encrypted connections, access controls on administrative systems, and rate limiting to reduce abuse. No system is perfectly secure, and we encourage you to avoid sharing sensitive information over unofficial channels.`,
  },
  {
    title: "Children's Privacy",
    body: `HustleCoin is not directed at children under 13, and we do not knowingly collect personal information from children under 13.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this policy as the product evolves. Material changes will be reflected by updating the "last updated" date below.`,
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Privacy Policy | HustleCoin"
        description="How HustleCoin collects, uses, and protects your information across the Telegram Mini App and public website."
        path="/privacy"
      />
      <section className="pt-20 pb-12 md:pt-32 md:pb-16 px-4 md:px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.h1
            className="text-4xl md:text-5xl font-heading font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Privacy Policy
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

          <div>
            <h2 className="text-2xl font-heading font-bold mb-3">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about this policy? Reach us via our{" "}
              <a href="/contact" className="text-primary hover:underline">contact page</a> or the{" "}
              <a href="https://t.me/HustleCoinMinerBot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Telegram community
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
