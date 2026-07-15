import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

export default function About() {
  return (
    <div className="flex flex-col w-full pb-20">
      <Seo
        title="About Us | HustleCoin"
        description="HustleCoin was born from a different ethos: Powered by the Hustle. Learn about our philosophy, execution, and commitments to a fair, effort-based ecosystem."
        path="/about"
      />
      {/* Header */}
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            About HustleCoin
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            We are building a new standard for Telegram-based engagement. A project rooted in consistency, effort, and community value.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-20">
            
            <motion.div 
              className="grid md:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div>
                <h2 className="text-3xl font-heading font-bold mb-4">The Philosophy</h2>
                <p className="text-muted-foreground leading-relaxed text-lg mb-4">
                  The crypto space is saturated with noise. Promises of overnight wealth, flashy graphics with no substance, and mechanics that reward bots over real users.
                </p>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  HustleCoin was born from a different ethos: <strong className="text-white">Powered by the Hustle.</strong> We believe value should be earned through consistent, deliberate action.
                </p>
              </div>
              <div className="aspect-square bg-card border border-white/10 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5" />
                <div className="text-6xl font-heading font-bold gold-gradient-text opacity-50 select-none">ETHOS</div>
              </div>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="md:order-2">
                <h2 className="text-3xl font-heading font-bold mb-4">The Execution</h2>
                <p className="text-muted-foreground leading-relaxed text-lg mb-4">
                  We chose the Telegram Mini App ecosystem because it removes friction. No complex wallet setups, no confusing on-ramps. If you have Telegram, you have access.
                </p>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  But accessible doesn't mean cheap. We've designed a premium interface that feels like a professional tool—responsive, data-rich, and built for heavy daily use.
                </p>
              </div>
              <div className="aspect-square bg-card border border-white/10 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden md:order-1">
                <div className="absolute inset-0 bg-white/5" />
                <div className="w-full h-full border border-white/10 rounded-xl relative">
                  <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-primary/50" />
                  <div className="absolute top-4 left-9 w-3 h-3 rounded-full bg-white/20" />
                  <div className="absolute bottom-4 right-4 text-xs font-mono text-muted-foreground">SYSTEM.ONLINE</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Manifesto Box */}
      <section className="px-4 md:px-6 mt-24">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="bg-black border border-primary/30 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.05)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
            <h3 className="text-2xl font-heading font-bold mb-6 text-primary uppercase tracking-widest text-sm">Our Commitments</h3>
            <ul className="space-y-6">
              {[
                { title: "No False Promises", desc: "We don't guarantee wealth. We provide a platform for effort." },
                { title: "Design Excellence", desc: "Every pixel must serve a purpose. Form follows function." },
                { title: "Community First", desc: "Real users are prioritized over bots. Fair distribution matters." }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="text-primary font-mono font-bold mt-1">0{i+1}</div>
                  <div>
                    <div className="font-bold text-white mb-1">{item.title}</div>
                    <div className="text-muted-foreground">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>
    </div>
  );
}