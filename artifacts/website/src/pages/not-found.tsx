import { motion } from "framer-motion";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col w-full h-full min-h-[70vh] justify-center items-center px-4">
      <motion.div 
        className="text-center max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-8xl font-heading font-bold text-white/10 mb-4">404</h1>
        <h2 className="text-2xl font-heading font-bold mb-4">Signal Lost</h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved. Keep your streak alive and head back to base.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Return Home
        </Link>
      </motion.div>
    </div>
  );
}