import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Users, Shield, Zap, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Link } from "wouter";
import { Seo } from "@/components/Seo";

interface Stats {
  totalUsers: number;
  totalHP: number;
  totalMines: number;
  totalReferrals: number;
  totalQuests: number;
  onlineUsers: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  
  useEffect(() => {
    apiFetch<Stats>("/api/public/stats").then(setStats).catch(() => {});
    apiFetch<{ content: Record<string, string> }>("/api/public/content").then(res => setContent(res.content || {})).catch(() => {});
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="flex flex-col w-full">
      <Seo
        title="HustleCoin (HSL) — Powered by the Hustle."
        description="HustleCoin (HSL) is a Telegram Mini App where users mine HP, earn streak bonuses, climb leaderboards, and grow a community. Powered by the Hustle."
        path="/"
      />
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-10 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white opacity-[0.02]" />
        
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm font-medium text-primary mb-6 backdrop-blur-sm uppercase tracking-wider">
                {content.content_hero_badge || "The New Standard in Telegram Mining"}
              </span>
            </motion.div>

            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold tracking-tight mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              dangerouslySetInnerHTML={{ __html: content.content_hero_title || `Powered by the <span class="gold-gradient-text">Hustle.</span>` }}
            />

            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {content.content_hero_subtitle || "Mine HP daily, build your streak, climb the leaderboards, and join the most driven community in Web3. No noise, just execution."}
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a
                href="https://t.me/HustleCoinMinerBot/hustlecoin"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105"
              >
                {content.content_hero_cta_primary || "Start Mining"} <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/HustleCoinMinerBot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                {content.content_hero_cta_secondary || "Join Telegram"}
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats / Proof Section */}
      <section className="py-20 border-y border-white/5 bg-black/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
            {[
              { label: "Active Miners", value: stats ? formatNumber(stats.totalUsers) : "50K+" },
              { label: "HP Distributed", value: stats ? `${formatNumber(stats.totalHP)} HP` : "2.4B" },
              { label: "Online Now", value: stats ? stats.onlineUsers.toLocaleString() : "1,204" },
              { label: "Total Mines", value: stats ? formatNumber(stats.totalMines) : "4.2M" }
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                className="text-center px-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {stats ? (
                  <div className="text-3xl md:text-5xl font-heading font-bold text-white mb-2">{stat.value}</div>
                ) : (
                  <div className="h-10 w-24 bg-white/10 animate-pulse mx-auto mb-2 rounded"></div>
                )}
                <div className="text-sm md:text-base text-muted-foreground uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Mechanics */}
      <section className="py-32 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Built for the Relentless</h2>
            <p className="text-muted-foreground text-lg">We designed HustleCoin around principles of consistency and effort. The mechanics reward those who show up every day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Daily Mining",
                desc: "Tap in daily to claim your HP base rate. The foundation of your empire."
              },
              {
                icon: TrendingUp,
                title: "Streak Multipliers",
                desc: "Don't break the chain. Consecutive days compound your earning power significantly."
              },
              {
                icon: Users,
                title: "Referral Networks",
                desc: "Bring in real builders. Earn a percentage of their lifetime mining output."
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-card-border p-8 rounded-2xl hover:border-primary/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal UI Teaser */}
      <section className="py-20 bg-card/50 overflow-hidden border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">A Premium Interface.</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Most mining apps feel like toys. We built HustleCoin to feel like a professional tool. Clean data, dark mode defaults, zero lag, pure execution.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Real-time global leaderboards",
                  "Detailed streak analytics",
                  "Instant quest verification",
                  "Secure Telegram integration"
                ].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://t.me/HustleCoinMinerBot/hustlecoin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-gray-200"
              >
                Experience It Now
              </a>
            </div>
            
            <div className="flex-1 w-full max-w-md lg:max-w-full">
              {/* Mock App UI */}
              <motion.div 
                className="relative mx-auto w-full max-w-[320px] aspect-[9/19] rounded-[40px] border-[8px] border-[#1a1a1a] bg-black shadow-2xl overflow-hidden"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                {/* App Content Mockup */}
                <div className="absolute inset-0 flex flex-col p-6 pt-12">
                  <div className="flex justify-between items-center mb-8">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black font-bold text-xs">H</div>
                    <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono">Streak: 🔥 14</div>
                  </div>
                  
                  <div className="text-center mb-10">
                    <div className="text-sm text-muted-foreground mb-2">Total Balance</div>
                    <div className="text-4xl font-heading font-bold gold-gradient-text">142,500 <span className="text-lg text-white">HP</span></div>
                  </div>

                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                        <div className="w-1/2 h-4 bg-white/10 rounded"></div>
                        <div className="w-1/4 h-4 bg-primary/20 rounded"></div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <div className="w-full py-4 bg-primary rounded-xl flex justify-center items-center font-bold text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                      MINE HP
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-heading font-bold mb-8">Ready to Put in the Work?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            The earliest adopters build the biggest advantages. Open Telegram and start your streak today.
          </p>
          <a
            href="https://t.me/HustleCoinMinerBot/hustlecoin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-10 py-5 text-lg font-bold text-primary-foreground shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all hover:scale-105"
          >
            Launch HustleCoin App
          </a>
          <p className="mt-6 text-sm text-muted-foreground">
            Want the full picture first?{" "}
            <Link href="/docs/whitepaper" className="text-primary hover:underline font-medium">
              Read the Whitepaper
            </Link>{" "}
            or browse the{" "}
            <Link href="/docs" className="text-primary hover:underline font-medium">
              Documentation Center
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
