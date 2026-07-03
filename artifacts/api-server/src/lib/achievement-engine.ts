/**
 * Achievement Engine
 *
 * Design contract:
 * - ACHIEVEMENT_ENGINE_LAUNCH is captured at module initialization (server start).
 * - Any achievement_unlock row with unlocked_at < ACHIEVEMENT_ENGINE_LAUNCH is
 *   **historical** — it displays as Unlocked in the UI but NO HP reward is ever
 *   granted for it by this engine.
 * - Post-launch unlocks receive HP atomically at the moment of unlock (no separate
 *   claim step). The transactions table (type="achievement") is the authoritative
 *   record of whether HP was awarded for a given unlock.
 *
 * Extensibility contract:
 * - To add a new achievement: add one entry to ACHIEVEMENT_DEFS + add the seed
 *   row via ensureSeedAchievements(). No other application code changes required.
 */

import {
  db,
  usersTable,
  achievementsTable,
  achievementUnlocksTable,
  transactionsTable,
  notificationsTable,
  referralsTable,
  taskCompletionsTable,
  questProgressTable,
} from "@workspace/db";
import { eq, and, count, gt, or, inArray } from "drizzle-orm";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Launch gate — captured once at module load (server start time).
// Unlocks before this timestamp are historical and never receive HP rewards.
// ---------------------------------------------------------------------------
export const ACHIEVEMENT_ENGINE_LAUNCH = new Date();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AchievementEvent = "login" | "mine" | "referral" | "task" | "quest";
export type AchievementTier = "bronze" | "silver" | "gold" | "diamond";

type UserRow = typeof usersTable.$inferSelect;

/** Pre-loaded data passed to every progress() function. */
export interface CheckData {
  user: UserRow;
  referralCount: number;       // count of referrals WHERE referrerTelegramId = telegramId
  taskCompletionCount: number; // count of task_completions WHERE status = 'completed'
  questClaimCount: number;     // count of quest_progress WHERE completed = 1
  globalRank: number;          // 1-based rank by balance (count of users with higher balance + 1)
}

interface AchievementDef {
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  reward: number;
  /** Events that can trigger this achievement's condition check. */
  events: AchievementEvent[];
  /**
   * Returns { current, target } for progress display and unlock condition.
   * When current >= target the achievement unlocks.
   */
  progress(data: CheckData): { current: number; target: number };
}

// ---------------------------------------------------------------------------
// Registry — single source of truth for all achievement logic.
// ---------------------------------------------------------------------------
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Mining ────────────────────────────────────────────────────────────────
  {
    title: "First Mine",
    description: "Mine your first HP coins",
    icon: "🏅",
    tier: "bronze",
    reward: 100,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.totalMines, 1), target: 1 }),
  },
  {
    title: "Mine 10 Times",
    description: "Complete 10 mining sessions",
    icon: "⛏️",
    tier: "bronze",
    reward: 100,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.totalMines, 10), target: 10 }),
  },
  {
    title: "Mine 50 Times",
    description: "Complete 50 mining sessions",
    icon: "🔨",
    tier: "silver",
    reward: 250,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.totalMines, 50), target: 50 }),
  },
  {
    title: "Mine 100 Times",
    description: "Complete 100 mining sessions",
    icon: "⚒️",
    tier: "gold",
    reward: 500,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.totalMines, 100), target: 100 }),
  },
  {
    title: "Mine 365 Times",
    description: "Complete 365 mining sessions",
    icon: "💫",
    tier: "diamond",
    reward: 1000,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.totalMines, 365), target: 365 }),
  },

  // ── Streaks ───────────────────────────────────────────────────────────────
  {
    title: "7 Day Streak",
    description: "Mine 7 days in a row",
    icon: "🔥",
    tier: "silver",
    reward: 250,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.streak, 7), target: 7 }),
  },
  {
    title: "30-Day Streak",
    description: "Mine 30 days in a row",
    icon: "♾️",
    tier: "gold",
    reward: 500,
    events: ["mine"],
    progress: (d) => ({ current: Math.min(d.user.streak, 30), target: 30 }),
  },

  // ── Referrals ─────────────────────────────────────────────────────────────
  {
    title: "First Referral",
    description: "Invite your first friend",
    icon: "👥",
    tier: "bronze",
    reward: 100,
    events: ["referral"],
    progress: (d) => ({ current: Math.min(d.referralCount, 1), target: 1 }),
  },
  {
    title: "Invite 5 Friends",
    description: "Refer 5 friends to HustleCoin",
    icon: "🤝",
    tier: "bronze",
    reward: 100,
    events: ["referral"],
    progress: (d) => ({ current: Math.min(d.referralCount, 5), target: 5 }),
  },
  {
    title: "Invite 10 Friends",
    description: "Refer 10 friends to HustleCoin",
    icon: "🌟",
    tier: "silver",
    reward: 250,
    events: ["referral"],
    progress: (d) => ({ current: Math.min(d.referralCount, 10), target: 10 }),
  },
  {
    title: "Invite 50 Friends",
    description: "Refer 50 friends to HustleCoin",
    icon: "🌐",
    tier: "diamond",
    reward: 1000,
    events: ["referral"],
    progress: (d) => ({ current: Math.min(d.referralCount, 50), target: 50 }),
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  {
    title: "Complete First Task",
    description: "Complete your first task",
    icon: "✅",
    tier: "bronze",
    reward: 100,
    events: ["task"],
    progress: (d) => ({ current: Math.min(d.taskCompletionCount, 1), target: 1 }),
  },
  {
    title: "Complete 10 Tasks",
    description: "Complete 10 tasks",
    icon: "📋",
    tier: "silver",
    reward: 250,
    events: ["task"],
    progress: (d) => ({ current: Math.min(d.taskCompletionCount, 10), target: 10 }),
  },
  {
    title: "Complete 50 Tasks",
    description: "Complete 50 tasks",
    icon: "🎯",
    tier: "gold",
    reward: 500,
    events: ["task"],
    progress: (d) => ({ current: Math.min(d.taskCompletionCount, 50), target: 50 }),
  },

  // ── Quests ────────────────────────────────────────────────────────────────
  {
    title: "Complete First Quest",
    description: "Complete your first quest",
    icon: "🗺️",
    tier: "bronze",
    reward: 100,
    events: ["quest"],
    progress: (d) => ({ current: Math.min(d.questClaimCount, 1), target: 1 }),
  },
  {
    title: "Complete 20 Quests",
    description: "Complete 20 quests",
    icon: "🏔️",
    tier: "gold",
    reward: 500,
    events: ["quest"],
    progress: (d) => ({ current: Math.min(d.questClaimCount, 20), target: 20 }),
  },

  // ── HP Balance ────────────────────────────────────────────────────────────
  {
    title: "1000 HP Club",
    description: "Accumulate 1000 HP",
    icon: "💎",
    tier: "bronze",
    reward: 100,
    events: ["mine", "task", "quest", "referral"],
    progress: (d) => ({ current: Math.min(d.user.balance, 1000), target: 1000 }),
  },
  {
    title: "5000 HP Holder",
    description: "Accumulate 5000 HP",
    icon: "💰",
    tier: "silver",
    reward: 250,
    events: ["mine", "task", "quest", "referral"],
    progress: (d) => ({ current: Math.min(d.user.balance, 5000), target: 5000 }),
  },
  {
    title: "Reach 10,000 HP",
    description: "Accumulate 10,000 HP",
    icon: "🤑",
    tier: "gold",
    reward: 500,
    events: ["mine", "task", "quest", "referral"],
    progress: (d) => ({
      current: Math.min(d.user.balance, 10000),
      target: 10000,
    }),
  },
  {
    title: "Reach 50,000 HP",
    description: "Accumulate 50,000 HP",
    icon: "👑",
    tier: "diamond",
    reward: 1000,
    events: ["mine", "task", "quest", "referral"],
    progress: (d) => ({
      current: Math.min(d.user.balance, 50000),
      target: 50000,
    }),
  },

  // ── Leaderboard ───────────────────────────────────────────────────────────
  {
    title: "Top 10 Leaderboard",
    description: "Reach the top 10 on the leaderboard",
    icon: "🏆",
    tier: "gold",
    reward: 500,
    events: ["mine", "login"],
    progress: (d) => ({ current: d.globalRank <= 10 ? 1 : 0, target: 1 }),
  },

  // ── Early Supporter ───────────────────────────────────────────────────────
  {
    title: "Early Supporter",
    description: "One of the first HustleCoin users",
    icon: "🚀",
    tier: "bronze",
    reward: 100,
    events: ["login"],
    progress: (_d) => ({ current: 1, target: 1 }), // Grants on first login
  },
];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

/**
 * Load all context data needed for achievement progress functions.
 * Pass event="all" when building the full achievement list for the UI.
 * For event-specific checks, only the data relevant to that event is loaded.
 */
export async function loadCheckData(
  telegramId: string,
  event: AchievementEvent | "all",
): Promise<CheckData> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  if (!user) throw new Error(`Achievement engine: user not found (${telegramId})`);

  const needsReferral = event === "referral" || event === "all";
  const needsTask = event === "task" || event === "all";
  const needsQuest = event === "quest" || event === "all";
  const needsRank = event === "mine" || event === "login" || event === "all";

  const data: CheckData = {
    user,
    referralCount: 0,
    taskCompletionCount: 0,
    questClaimCount: 0,
    globalRank: 9999,
  };

  const loaders: Promise<void>[] = [];

  if (needsReferral) {
    loaders.push(
      db
        .select({ c: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, telegramId))
        .then(([r]) => {
          data.referralCount = Number(r!.c);
        }),
    );
  }

  if (needsTask) {
    loaders.push(
      db
        .select({ c: count() })
        .from(taskCompletionsTable)
        .where(
          and(
            eq(taskCompletionsTable.telegramId, telegramId),
            or(
              eq(taskCompletionsTable.status, "completed"),
              eq(taskCompletionsTable.status, "approved"),
            ),
          ),
        )
        .then(([r]) => {
          data.taskCompletionCount = Number(r!.c);
        }),
    );
  }

  if (needsQuest) {
    loaders.push(
      db
        .select({ c: count() })
        .from(questProgressTable)
        .where(
          and(
            eq(questProgressTable.telegramId, telegramId),
            eq(questProgressTable.completed, 1),
          ),
        )
        .then(([r]) => {
          data.questClaimCount = Number(r!.c);
        }),
    );
  }

  if (needsRank) {
    loaders.push(
      db
        .select({ c: count() })
        .from(usersTable)
        .where(gt(usersTable.balance, user.balance))
        .then(([r]) => {
          data.globalRank = Number(r!.c) + 1;
        }),
    );
  }

  await Promise.all(loaders);
  return data;
}

// ---------------------------------------------------------------------------
// Atomic unlock
// ---------------------------------------------------------------------------

/**
 * Attempt to unlock a single achievement for a user.
 * Runs entirely inside its own transaction with a row-lock on the user.
 * Returns true if newly unlocked, false if already existed (idempotent).
 */
async function unlockAchievementAtomic(
  telegramId: string,
  def: AchievementDef,
  achievementId: number,
): Promise<boolean> {
  let didUnlock = false;

  await db.transaction(async (tx) => {
    // Race-condition guard: re-check for existing unlock inside the transaction
    const [existing] = await tx
      .select({ id: achievementUnlocksTable.id })
      .from(achievementUnlocksTable)
      .where(
        and(
          eq(achievementUnlocksTable.telegramId, telegramId),
          eq(achievementUnlocksTable.achievementId, achievementId),
        ),
      )
      .limit(1);

    if (existing) return; // Already unlocked concurrently — skip silently

    // Lock user row to serialize balance updates
    const [lockedUser] = await tx
      .select({ id: usersTable.id, balance: usersTable.balance })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .for("update")
      .limit(1);

    if (!lockedUser) return; // User deleted mid-flight — skip

    const newBalance = lockedUser.balance + def.reward;

    // 1. Create the unlock row
    const [unlock] = await tx
      .insert(achievementUnlocksTable)
      .values({ achievementId, telegramId })
      .returning();

    // 2. Award HP
    await tx
      .update(usersTable)
      .set({ balance: newBalance })
      .where(eq(usersTable.telegramId, telegramId));

    // 3. Transaction record (type="achievement" + relatedId=unlock.id)
    await tx.insert(transactionsTable).values({
      telegramId,
      type: "achievement",
      amount: def.reward,
      balanceBefore: lockedUser.balance,
      balanceAfter: newBalance,
      description: `Achievement unlocked: ${def.title}`,
      relatedId: String(unlock.id),
    });

    // 4. Notification
    await tx.insert(notificationsTable).values({
      telegramId,
      title: `Achievement Unlocked! ${def.icon}`,
      message: `You unlocked "${def.title}" and earned ${def.reward} HP!`,
      type: "achievement",
      relatedEntity: String(unlock.id),
    });

    didUnlock = true;
  });

  return didUnlock;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NewUnlock {
  achievementId: number;
  title: string;
  icon: string;
  tier: AchievementTier;
  reward: number;
}

/**
 * Check and unlock any achievements that have become eligible after an event.
 * Safe to call fire-and-forget from any route after its main transaction commits.
 *
 * @param telegramId  The user to check
 * @param event       The triggering event, or "all" for a full sweep
 * @returns           List of achievements newly unlocked in this call
 */
export async function checkAchievementsAfterEvent(
  telegramId: string,
  event: AchievementEvent | "all",
): Promise<NewUnlock[]> {
  // Load data + DB achievement rows + existing unlocks in parallel
  const [data, allDbAchievements, existingUnlocks] = await Promise.all([
    loadCheckData(telegramId, event),
    db.select().from(achievementsTable),
    db
      .select()
      .from(achievementUnlocksTable)
      .where(eq(achievementUnlocksTable.telegramId, telegramId)),
  ]);

  const dbByTitle = new Map(allDbAchievements.map((a) => [a.title, a]));
  const alreadyUnlockedIds = new Set(existingUnlocks.map((u) => u.achievementId));

  const defs =
    event === "all"
      ? ACHIEVEMENT_DEFS
      : ACHIEVEMENT_DEFS.filter((d) => d.events.includes(event));

  const newUnlocks: NewUnlock[] = [];

  for (const def of defs) {
    const dbRow = dbByTitle.get(def.title);
    if (!dbRow) continue; // Not seeded yet — skip safely

    if (alreadyUnlockedIds.has(dbRow.id)) continue; // Already unlocked

    const { current, target } = def.progress(data);
    if (current < target) continue; // Condition not met

    const didUnlock = await unlockAchievementAtomic(telegramId, def, dbRow.id);

    if (didUnlock) {
      newUnlocks.push({
        achievementId: dbRow.id,
        title: def.title,
        icon: def.icon,
        tier: def.tier,
        reward: def.reward,
      });

      // Update local balance so subsequent HP-threshold checks in this loop
      // reflect the HP just awarded (avoids loading fresh data from DB mid-loop).
      data.user = { ...data.user, balance: data.user.balance + def.reward };
      alreadyUnlockedIds.add(dbRow.id);

      logger.info(
        { telegramId, achievementId: dbRow.id, title: def.title, reward: def.reward },
        "Achievement unlocked",
      );
    }
  }

  return newUnlocks;
}

// ---------------------------------------------------------------------------
// Response builder (used by the achievements route)
// ---------------------------------------------------------------------------

export interface AchievementItem {
  id: number;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  reward: number;
  /** true if an unlock row exists for this user (historical or post-launch) */
  unlocked: boolean;
  /** ISO timestamp of unlock, or null */
  unlockedAt: string | null;
  /**
   * true only for post-launch unlocks that have a matching "achievement"
   * transaction row. Always false for historical (pre-launch) unlocks.
   */
  rewarded: boolean;
  /** Current progress toward the milestone threshold */
  progress: number;
  /** Target value needed to unlock */
  target: number;
}

export function buildAchievementItem(
  def: AchievementDef,
  dbRow: { id: number },
  unlock: { id: number; unlockedAt: Date } | null,
  rewardedIds: Set<string>,
  data: CheckData,
): AchievementItem {
  const { current, target } = def.progress(data);

  // Historical guard: only post-launch unlocks can be rewarded
  const isPostLaunch = unlock != null && unlock.unlockedAt >= ACHIEVEMENT_ENGINE_LAUNCH;
  const rewarded = isPostLaunch && rewardedIds.has(String(unlock!.id));

  return {
    id: dbRow.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    tier: def.tier,
    reward: def.reward,
    unlocked: unlock != null,
    unlockedAt: unlock?.unlockedAt.toISOString() ?? null,
    rewarded,
    progress: Math.min(current, target),
    target,
  };
}
