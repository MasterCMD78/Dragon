import { motion } from "framer-motion";
import { Pickaxe, Flame, Users, Trophy, Target, Shield } from "lucide-react";
import { Seo } from "@/components/Seo";

const docs = [
  {
    icon: Pickaxe,
    title: "Getting Started",
    body: `Open the HustleCoin bot in Telegram and launch the Mini App. Your account is created automatically from your Telegram profile — no wallet or sign-up form required. Tap "Mine" once every mining cycle to earn HP.`,
  },
  {
    icon: Flame,
    title: "Streaks",
    body: `Mining on consecutive days increases your streak. Higher streaks apply a multiplier to your base HP rate. Missing a full day resets your streak back to zero, so the biggest gains come from steady daily activity rather than occasional bursts.`,
  },
  {
    icon: Users,
    title: "Referrals",
    body: `Share your personal referral link from inside the Mini App. When someone joins through your link and starts mining, you earn a percentage of their mining activity as a referral bonus. Referral abuse (self-referrals, fake accounts) is detected and penalized.`,
  },
  {
    icon: Target,
    title: "Quests & Tasks",
    body: `Quests are one-time or recurring actions — such as joining a partner channel or hitting an activity milestone — that reward a lump sum of HP on completion. Check the Tasks tab in the Mini App regularly, as new quests are added periodically.`,
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    body: `Leaderboards rank users globally by balance, by total mining activity, and by referral count. Rankings refresh continuously and reflect a short caching window (typically under a minute) to keep the app responsive under load.`,
  },
  {
    icon: Shield,
    title: "Fair Play & Anti-Bot",
    body: `HustleCoin actively monitors for multi-accounting, automation, and sybil referral networks. Accounts found violating fair-play rules have their HP reset and are banned from the platform. This protects real users' rankings and future ecosystem benefits.`,
  },
];

export default function Documentation() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Documentation | HustleCoin"
        description="Learn how HustleCoin's mining, streaks, referrals, quests, and leaderboards work."
        path="/documentation"
      />
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Documentation
          </motion.h1>
          <motion.p
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Everything you need to know to get the most out of HustleCoin.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-4xl space-y-16">
          {docs.map((d, i) => (
            <motion.div
              key={d.title}
              className="flex gap-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="w-12 h-12 shrink-0 bg-black border border-white/10 rounded-xl flex items-center justify-center text-primary">
                <d.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold mb-3">{d.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{d.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
