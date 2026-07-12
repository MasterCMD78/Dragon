import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";

export default function News() {
  return (
    <div className="flex flex-col w-full h-full min-h-[60vh] justify-center items-center px-4">
      <motion.div 
        className="text-center max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 mx-auto bg-card border border-white/10 rounded-full flex items-center justify-center mb-8 shadow-xl">
          <Newspaper className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">News & Updates</h1>
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          We are currently head-down building. Major announcements, dev logs, and ecosystem updates will be published here soon.
        </p>
        <div className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Transmission pending...
        </div>
      </motion.div>
    </div>
  );
}