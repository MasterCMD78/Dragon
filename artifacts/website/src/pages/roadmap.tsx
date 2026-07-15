import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CircleDashed, Rocket } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Seo } from "@/components/Seo";

const hardcodedRoadmap = [
  {
    title: "Phase 1: Foundation",
    status: "completed",
    progress: 100,
    items: [
      "Core Telegram Bot Development",
      "Mini App UI/UX Design",
      "Basic HP Mining Mechanics",
      "Streak & Reward Systems",
      "Initial Alpha Testing"
    ]
  },
  {
    title: "Phase 2: Growth",
    status: "in_progress",
    progress: 60,
    items: [
      "Public Launch via Telegram",
      "Referral System Activation",
      "Global Leaderboards",
      "Task & Quest Engine",
      "Marketing Campaigns Initiation"
    ]
  },
  {
    title: "Phase 3: Expansion",
    status: "planned",
    progress: 0,
    items: [
      "Advanced Squads/Clans System",
      "Interactive Mini-Games",
      "Partner Integrations",
      "Enhanced Anti-Cheat Mechanics",
      "Community Governance V1"
    ]
  },
  {
    title: "Phase 4: Ecosystem",
    status: "planned",
    progress: 0,
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
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ phases: any[] }>("/api/public/roadmap")
      .then(res => {
        if (res.phases && res.phases.length > 0) {
          setPhases(res.phases);
        } else {
          setPhases(hardcodedRoadmap);
        }
      })
      .catch(() => setPhases(hardcodedRoadmap))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="Roadmap | HustleCoin"
        description="A clear path forward. Track HustleCoin's development phases from foundation and growth through tokenomics and ecosystem expansion."
        path="/roadmap"
      />
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Rocket className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">The Roadmap</h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              A clear path forward. We execute in phases, ensuring stability before scale.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="relative border-l border-white/10 pl-6 md:pl-10 space-y-20 py-8">
              {phases.map((phase, i) => (
                <motion.div
                  key={i}
                  className="relative"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1 }}
                >
                  {/* Timeline dot */}
                  <div className={`absolute -left-[31px] md:-left-[47px] top-1 w-4 h-4 rounded-full border-4 border-background ${
                    phase.status === 'completed' ? 'bg-primary' : 
                    phase.status === 'in_progress' ? 'bg-white' : 'bg-muted-foreground'
                  }`} />

                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="text-2xl font-heading font-bold text-white">{phase.title}</h2>
                    {phase.status === 'in_progress' && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2 py-1 rounded">In Progress</span>
                    )}
                  </div>
                  
                  {phase.description && (
                    <p className="text-muted-foreground mb-4">{phase.description}</p>
                  )}

                  <div className={`bg-card border border-white/5 rounded-2xl p-6 md:p-8 mt-6 shadow-xl ${phase.status === 'in_progress' ? 'border-primary/30 shadow-[0_0_30px_rgba(212,175,55,0.05)]' : ''}`}>
                    
                    {phase.progress > 0 && (
                      <div className="mb-8">
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-white">Phase Completion</span>
                          <span className="text-primary">{phase.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${phase.progress}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    )}

                    <ul className="space-y-4">
                      {phase.items.map((item: string, j: number) => (
                        <li key={j} className="flex items-start gap-3">
                          {phase.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          ) : phase.status === 'in_progress' ? (
                            <CircleDashed className="w-5 h-5 text-white/50 shrink-0 mt-0.5 animate-[spin_4s_linear_infinite]" />
                          ) : (
                            <CircleDashed className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span className={phase.status === 'planned' ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
