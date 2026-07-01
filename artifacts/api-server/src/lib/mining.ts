/**
 * Mining reward calculation — consistent with production data.
 *
 * From production mining_logs:
 *   streak 1       → bonus 0  (100 HP total)
 *   streak 2–6     → bonus 10 (110 HP total)
 *   streak 7+      → bonus 50 (150 HP total)
 *
 * SESSION_DURATION_MS: 24 hours
 */

export const BASE_HP = 100;
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function calcBonusHp(streak: number): number {
  if (streak >= 7) return 50;
  if (streak >= 2) return 10;
  return 0;
}

export function calcReward(streak: number): { hpEarned: number; bonusHp: number; total: number } {
  const bonusHp = calcBonusHp(streak);
  return { hpEarned: BASE_HP, bonusHp, total: BASE_HP + bonusHp };
}

/** HP earned per hour (for display). */
export function calcMiningRate(streak: number): number {
  return parseFloat(((BASE_HP + calcBonusHp(streak)) / 24).toFixed(2));
}

export function buildMiningDescription(bonusHp: number, streak: number): string {
  if (bonusHp > 0) {
    return `Daily mining reward (+${bonusHp} HC streak bonus, day ${streak})`;
  }
  return "Daily mining reward";
}

/** Given a session start time, return seconds remaining (0 if complete). */
export function secondsRemaining(sessionStart: Date): number {
  const endsAt = new Date(sessionStart.getTime() + SESSION_DURATION_MS);
  const remaining = Math.floor((endsAt.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}
