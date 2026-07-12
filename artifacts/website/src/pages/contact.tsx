import { motion } from "framer-motion";
import { MessageCircle, Mail, Globe } from "lucide-react";

export default function Contact() {
  return (
    <div className="flex flex-col w-full pb-20">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-heading font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Get in Touch
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            We live where our community lives. Telegram is our primary hub for all support, partnerships, and general inquiries.
          </motion.p>
        </div>
      </section>

      <section className="px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            
            <motion.a
              href="https://t.me/HustleCoinMinerBot"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border border-primary/30 p-8 rounded-3xl hover:bg-primary/5 transition-all group relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform" />
              <div className="w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-2">Telegram Community</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of active miners. Ask questions, report bugs, or discuss strategies.
              </p>
              <span className="font-medium text-primary group-hover:text-white transition-colors flex items-center gap-2">
                Join Group &rarr;
              </span>
            </motion.a>

            <motion.div
              className="bg-card border border-white/5 p-8 rounded-3xl opacity-80"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-white/5 text-muted-foreground rounded-full flex items-center justify-center mb-6">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-2">Business Inquiries</h2>
              <p className="text-muted-foreground mb-6">
                For partnerships, integrations, or media inquiries, please reach out via Telegram DM to our core team admins.
              </p>
              <span className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
                Via Telegram Only
              </span>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
}