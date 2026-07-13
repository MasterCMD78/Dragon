import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { KeyRound, CheckCircle2 } from "lucide-react";

export default function AdminSettings() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/admin/website-auth/set-password", {
        method: "POST",
        body: JSON.stringify({ password })
      });
      setSuccess(true);
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-heading font-bold">Settings</h1>
      
      <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Change Password</h2>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Password updated successfully
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm Password</label>
            <input 
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white focus:border-primary outline-none"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
