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

/**
 * HP thresholds required to reach each level (index = level - 1).
 * Level 1 starts at 0 HP and is the default for new users.
 * Level is recalculated automatically every time HP changes (e.g. on mine claim).
 */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0,       // Level 1  — new user
  500,     // Level 2
  1_500,   // Level 3
  3_000,   // Level 4
  6_000,   // Level 5
  10_000,  // Level 6
  15_000,  // Level 7
  25_000,  // Level 8
  40_000,  // Level 9
  60_000,  // Level 10
];

/**
 * Derive the correct level from a user's current HP balance.
 * Returns a value between 1 and LEVEL_THRESHOLDS.length (inclusive).
 */
export function calculateLevel(balance: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (balance >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}
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
