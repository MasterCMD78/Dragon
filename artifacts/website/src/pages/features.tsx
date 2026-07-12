import { motion } from "framer-motion";
import { Pickaxe, Flame, Trophy, Users, Target, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Pickaxe,
    title: "Core Mining",
    desc: "Generate HP daily through the core mining mechanism. Base rates are determined by network participation and your current tier."
  },
  {
    icon: Flame,
    title: "Streak Multiplier",
    desc: "Consistency is heavily rewarded. Logging in on consecutive days builds a streak multiplier that significantly boosts your HP generation."
  },
  {
    icon: Users,
    title: "Referral Engine",
    desc: "Grow the network, grow your balance. Earn a flat percentage bonus based on the daily mining activity of users you invite."
  },
  {
    icon: Trophy,
    title: "Global Leaderboards",
    desc: "Compete with the entire network. Track your position on the global ladder, or filter by your direct referral network."
  },
  {
    icon: Target,
    title: "Quests & Tasks",
    desc: "Complete specific actions—like engaging with partners or hitting milestones—to earn lump-sum HP rewards instantly."
  },
  {
    icon: ShieldCheck,
    title: "Bot Protection",
    desc: "Our systems are designed to reward real human effort. Advanced anti-bot measures ensure the leaderboards remain legitimate."
  }
];

export default function Features() {
  return (
    <div className="flex flex-col w-full pb-20">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            The Mechanics
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Engineered for engagement. Designed for longevity. Explore the systems that power HustleCoin.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="bg-card border border-white/5 p-8 rounded-2xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-16 -translate-y-16 group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 bg-black border border-white/10 rounded-xl flex items-center justify-center mb-6 relative z-10 text-primary">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3 relative z-10">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm relative z-10">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-6 mt-32">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-black border border-white/10 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-heading font-bold mb-4">Start Earning Today</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                The application runs entirely within Telegram. No downloads, no seed phrases required to start. Just open the bot and begin mining.
              </p>
              <a
                href="https://t.me/HustleCoinMinerBot/hustlecoin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-bold text-black transition-all hover:bg-primary/90"
              >
                Launch App
              </a>
            </div>
            <div className="flex-1 w-full relative">
              <div className="aspect-video bg-card border border-white/10 rounded-2xl p-6 flex flex-col justify-center shadow-2xl">
                <div className="space-y-4">
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-full"></div>
                  <div className="h-4 bg-white/5 rounded w-5/6"></div>
                  <div className="flex gap-4 pt-4">
                    <div className="h-10 bg-primary/20 rounded w-1/3"></div>
                    <div className="h-10 bg-white/5 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}