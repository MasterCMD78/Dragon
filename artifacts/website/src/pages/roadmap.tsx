import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed } from "lucide-react";

const roadmap = [
  {
    phase: "Phase 1: Foundation",
    status: "completed",
    items: [
      "Core Telegram Bot Development",
      "Mini App UI/UX Design",
      "Basic HP Mining Mechanics",
      "Streak & Reward Systems",
      "Initial Alpha Testing"
    ]
  },
  {
    phase: "Phase 2: Growth",
    status: "current",
    items: [
      "Public Launch via Telegram",
      "Referral System Activation",
      "Global Leaderboards",
      "Task & Quest Engine",
      "Marketing Campaigns Initiation"
    ]
  },
  {
    phase: "Phase 3: Expansion",
    status: "upcoming",
    items: [
      "Advanced Squads/Clans System",
      "Interactive Mini-Games",
      "Partner Integrations",
      "Enhanced Anti-Cheat Mechanics",
      "Community Governance V1"
    ]
  },
  {
    phase: "Phase 4: Ecosystem",
    status: "upcoming",
    items: [
      "Tokenomics Whitepaper Release",
      "On-chain Integration Preparation",
      "Airdrop Mechanics Detail",
      "Exchange Partnership Announcements",
      "TGE (Token Generation Event)"
    ]
  }
];

export default function Roadmap() {
  return (
    <div className="flex flex-col w-full pb-20">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            The Roadmap
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            A clear path forward. We execute in phases, ensuring stability before scale.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative border-l border-white/10 pl-6 md:pl-10 space-y-20 py-8">
            {roadmap.map((phase, i) => (
              <motion.div
                key={phase.phase}
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1 }}
              >
                {/* Timeline dot */}
                <div className={`absolute -left-[31px] md:-left-[47px] top-1 w-4 h-4 rounded-full border-4 border-background ${
                  phase.status === 'completed' ? 'bg-primary' : 
                  phase.status === 'current' ? 'bg-white' : 'bg-muted-foreground'
                }`} />

                <div className="mb-2 flex items-center gap-3">
                  <h2 className="text-2xl font-heading font-bold text-white">{phase.phase}</h2>
                  {phase.status === 'current' && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2 py-1 rounded">In Progress</span>
                  )}
                </div>

                <div className={`bg-card border border-white/5 rounded-2xl p-6 mt-6 shadow-xl ${phase.status === 'current' ? 'border-primary/30 shadow-[0_0_30px_rgba(212,175,55,0.05)]' : ''}`}>
                  <ul className="space-y-4">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        {phase.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        ) : phase.status === 'current' ? (
                          <CircleDashed className="w-5 h-5 text-white/50 shrink-0 mt-0.5 animate-[spin_4s_linear_infinite]" />
                        ) : (
                          <CircleDashed className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className={phase.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}