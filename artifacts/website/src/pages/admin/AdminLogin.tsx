import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [telegramId, setTelegramId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(telegramId, password);
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0,transparent_50%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-center mb-2">Command Center</h1>
          <p className="text-muted-foreground text-center mb-8">Authorized personnel only.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Telegram ID</label>
              <input 
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black font-bold py-3 rounded-xl mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Access System"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
