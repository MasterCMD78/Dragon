import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Save, Loader2, ToggleLeft, ToggleRight, Coins, Gift } from "lucide-react";

interface SettingsState {
  welcome_bonus_enabled: boolean;
  welcome_bonus_amount: number;
  referral_bonus_amount: number;
}

const DEFAULT_SETTINGS: SettingsState = {
  welcome_bonus_enabled: true,
  welcome_bonus_amount: 250,
  referral_bonus_amount: 500,
};

export function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminApi
      .getSettings()
      .then(({ settings: raw }) => {
        // Use explicit NaN checks so saved values of 0 are respected (not
        // replaced by defaults via the falsy || short-circuit).
        const wba = parseInt(raw["welcome_bonus_amount"] ?? "250", 10);
        const rba = parseInt(raw["referral_bonus_amount"] ?? "500", 10);
        const parsed: SettingsState = {
          welcome_bonus_enabled: raw["welcome_bonus_enabled"] !== "false",
          welcome_bonus_amount: isNaN(wba) ? 250 : Math.max(0, wba),
          referral_bonus_amount: isNaN(rba) ? 500 : Math.max(0, rba),
        };
        setSettings(parsed);
        setOriginal(parsed);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const isDirty =
    settings.welcome_bonus_enabled !== original.welcome_bonus_enabled ||
    settings.welcome_bonus_amount !== original.welcome_bonus_amount ||
    settings.referral_bonus_amount !== original.referral_bonus_amount;

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings({
        welcome_bonus_enabled: settings.welcome_bonus_enabled,
        welcome_bonus_amount: settings.welcome_bonus_amount,
        referral_bonus_amount: settings.referral_bonus_amount,
      });
      setOriginal(settings);
      toast({ title: "Settings saved", description: "Changes will apply to all future users immediately." });
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        <p>{error}</p>
        <button onClick={load} className="mt-2 text-primary underline text-xs">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-white font-display font-bold text-lg">Bonus Settings</h2>
        <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">
          Super Admin Only
        </span>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Changes apply immediately to all future users. Existing users are not affected.
      </p>

      {/* Welcome Bonus Toggle */}
      <div className="bg-card/60 rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <span className="text-white text-sm font-semibold">Welcome Bonus System</span>
        </div>
        <p className="text-muted-foreground text-xs">
          When enabled, new users who join via a referral link receive a welcome bonus, and the referrer receives a referral reward.
        </p>
        <button
          onClick={() => setSettings((s) => ({ ...s, welcome_bonus_enabled: !s.welcome_bonus_enabled }))}
          className="flex items-center gap-2 transition-colors"
        >
          {settings.welcome_bonus_enabled ? (
            <ToggleRight className="w-8 h-8 text-emerald-400" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-muted-foreground" />
          )}
          <span className={`text-sm font-semibold ${settings.welcome_bonus_enabled ? "text-emerald-400" : "text-muted-foreground"}`}>
            {settings.welcome_bonus_enabled ? "Enabled" : "Disabled"}
          </span>
        </button>
      </div>

      {/* Welcome Bonus Amount */}
      <div className="bg-card/60 rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-blue-400" />
          <span className="text-white text-sm font-semibold">Welcome Bonus Amount</span>
        </div>
        <p className="text-muted-foreground text-xs">
          HP awarded to the new user who joins via a referral link.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            step={50}
            value={settings.welcome_bonus_amount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0) setSettings((s) => ({ ...s, welcome_bonus_amount: v }));
            }}
            className="w-28 bg-background border border-border/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-muted-foreground text-sm">HP</span>
        </div>
        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {[50, 100, 250, 500, 1000].map((v) => (
            <button
              key={v}
              onClick={() => setSettings((s) => ({ ...s, welcome_bonus_amount: v }))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                settings.welcome_bonus_amount === v
                  ? "bg-primary text-black"
                  : "bg-border/20 text-muted-foreground hover:text-white hover:bg-border/30"
              }`}
            >
              {v} HP
            </button>
          ))}
        </div>
      </div>

      {/* Referral Bonus Amount */}
      <div className="bg-card/60 rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm font-semibold">Referral Bonus Amount</span>
        </div>
        <p className="text-muted-foreground text-xs">
          HP awarded to the existing user who referred a new member.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            step={50}
            value={settings.referral_bonus_amount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0) setSettings((s) => ({ ...s, referral_bonus_amount: v }));
            }}
            className="w-28 bg-background border border-border/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-muted-foreground text-sm">HP</span>
        </div>
        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {[50, 100, 250, 500, 1000].map((v) => (
            <button
              key={v}
              onClick={() => setSettings((s) => ({ ...s, referral_bonus_amount: v }))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                settings.referral_bonus_amount === v
                  ? "bg-primary text-black"
                  : "bg-border/20 text-muted-foreground hover:text-white hover:bg-border/30"
              }`}
            >
              {v} HP
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={() => void handleSave()}
        disabled={!isDirty || saving}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display font-bold text-sm transition-all ${
          isDirty && !saving
            ? "bg-primary text-black hover:bg-primary/90"
            : "bg-border/30 text-muted-foreground cursor-not-allowed"
        }`}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving…" : isDirty ? "Save Settings" : "No Changes"}
      </button>

      {/* Info box */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
        <p className="text-yellow-400 text-xs leading-relaxed">
          <strong>Security:</strong> All changes are logged in the Audit Log with your Telegram ID, username, and the old and new values.
          Only Super Admins can access this page.
        </p>
      </div>
    </div>
  );
}
