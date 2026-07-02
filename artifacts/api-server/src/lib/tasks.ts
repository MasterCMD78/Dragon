import { db, usersTable, referralsTable, tasksTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

export type TaskCategory = "daily" | "one_time";
export type TaskStatus = "available" | "in_progress" | "pending_approval" | "completed";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Server start time. Task completions that already existed in the database before
 * this moment come from the pre-rebuild system and must never be (re)paid through
 * the new claim flow, even if their `status` looks "approved" — there is no reliable
 * way to know whether they were already paid out by the old system.
 */
export const FEATURE_LAUNCH_AT = new Date();

type Verifier = (user: typeof usersTable.$inferSelect) => Promise<boolean> | boolean;

interface TaskDef {
  match: RegExp;
  category: TaskCategory;
  verify: Verifier;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/**
 * Built-in condition verifiers for tasks we can actually check server-side.
 * Matched by task title (case-insensitive). Anything not matched here falls back
 * to a generic self-reported completion (trusted only for `automatic` task type,
 * exactly like a "tap to confirm you followed us" flow).
 */
const TASK_DEFS: TaskDef[] = [
  {
    match: /daily login/i,
    category: "daily",
    verify: (user) => isSameUtcDay(user.lastActive, new Date()),
  },
  {
    match: /mine today/i,
    category: "daily",
    verify: (user) => !!user.lastMine && isSameUtcDay(user.lastMine, new Date()),
  },
  {
    match: /visit leaderboard/i,
    category: "daily",
    // The condition is "the user opened the leaderboard" — signaled by the
    // frontend calling /complete from that screen. Low-value (10 HP), so the
    // trust tradeoff mirrors other client-observable daily check-ins.
    verify: () => true,
  },
  {
    match: /visit referral/i,
    category: "daily",
    verify: () => true,
  },
  {
    match: /invite friends?/i,
    category: "one_time",
    verify: async (user) => {
      const [row] = await db
        .select({ c: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, user.telegramId));
      return (row?.c ?? 0) > 0;
    },
  },
];

export function classifyTask(title: string): { category: TaskCategory; verify: Verifier | null } {
  for (const def of TASK_DEFS) {
    if (def.match.test(title)) return { category: def.category, verify: def.verify };
  }
  return { category: "one_time", verify: null };
}

interface SeedTask {
  title: string;
  description: string;
  reward: number;
  taskType: "automatic" | "manual";
}

const SEED_TASKS: SeedTask[] = [
  { title: "Daily Login", description: "Open HustleCoin today", reward: 20, taskType: "automatic" },
  { title: "Mine Today", description: "Complete a mining claim today", reward: 30, taskType: "automatic" },
  { title: "Visit Leaderboard", description: "Check out the leaderboard", reward: 10, taskType: "automatic" },
  { title: "Visit Referral Page", description: "Check your referral stats", reward: 10, taskType: "automatic" },
  { title: "Invite Friends", description: "Invite at least one friend to HustleCoin", reward: 100, taskType: "automatic" },
];

/**
 * Seed the canonical daily/invite tasks into the existing `tasks` table if they
 * are not already present (matched by title). Pure data insert — no schema change.
 */
export async function ensureSeedTasks(): Promise<void> {
  const existing = await db.select({ title: tasksTable.title }).from(tasksTable);
  const existingTitles = new Set(existing.map((t) => t.title.trim().toLowerCase()));
  const missing = SEED_TASKS.filter((t) => !existingTitles.has(t.title.toLowerCase()));
  if (missing.length === 0) return;

  await db.insert(tasksTable).values(
    missing.map((t) => ({
      title: t.title,
      description: t.description,
      reward: t.reward,
      taskType: t.taskType,
      status: "active",
    })),
  );
}
