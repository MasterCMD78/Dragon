import {
  db,
  usersTable,
  miningLogsTable,
  taskCompletionsTable,
  referralsTable,
  transactionsTable,
  questsTable,
  questProgressTable,
} from "@workspace/db";
import { eq, and, gte, count, sum } from "drizzle-orm";

export type QuestCategory = "daily" | "weekly";

// ---------- Period key helpers ----------

export function getDailyKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getISOWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export function getTodayStartDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------- Quest type registry ----------

type User = typeof usersTable.$inferSelect;

interface QuestTypeDef {
  category: QuestCategory;
  computeProgress: (user: User) => Promise<number>;
}

const REGISTRY: Record<string, QuestTypeDef> = {
  mine: {
    category: "daily",
    computeProgress: async (user) => {
      const todayStart = getTodayStartDate();
      const [row] = await db
        .select({ c: count() })
        .from(miningLogsTable)
        .where(
          and(
            eq(miningLogsTable.telegramId, user.telegramId),
            gte(miningLogsTable.minedAt, todayStart),
          ),
        );
      return Number(row?.c ?? 0);
    },
  },

  complete_task: {
    category: "daily",
    computeProgress: async (user) => {
      const todayStart = getTodayStartDate();
      const [row] = await db
        .select({ c: count() })
        .from(taskCompletionsTable)
        .where(
          and(
            eq(taskCompletionsTable.telegramId, user.telegramId),
            eq(taskCompletionsTable.status, "completed"),
            gte(taskCompletionsTable.completedAt, todayStart),
          ),
        );
      return Number(row?.c ?? 0);
    },
  },

  invite_friend: {
    category: "daily",
    computeProgress: async (user) => {
      const [row] = await db
        .select({ c: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, user.telegramId));
      return Number(row?.c ?? 0);
    },
  },

  login_streak: {
    category: "daily",
    computeProgress: async (user) => user.streak,
  },

  earn_hp: {
    category: "weekly",
    computeProgress: async (user) => {
      const weekStart = getWeekStartDate();
      const [row] = await db
        .select({ total: sum(transactionsTable.amount) })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.telegramId, user.telegramId),
            gte(transactionsTable.createdAt, weekStart),
          ),
        );
      return Math.max(0, Number(row?.total ?? 0));
    },
  },

  weekly_challenge: {
    category: "weekly",
    computeProgress: async (user) => {
      // Count distinct quest types (mine, complete_task, invite_friend) completed this week.
      const weekKey = getISOWeekKey();
      const rows = await db
        .select({ questId: questProgressTable.questId })
        .from(questProgressTable)
        .where(
          and(
            eq(questProgressTable.telegramId, user.telegramId),
            eq(questProgressTable.completed, 1),
            eq(questProgressTable.date, weekKey),
          ),
        );
      // Count quests that are daily-category (excludes weekly ones to avoid circularity)
      const dailyQuestIds = await getDailyQuestIds();
      const completedDailyIds = rows.filter((r) => dailyQuestIds.has(r.questId));
      return Math.min(completedDailyIds.length, 99); // cap sensibly
    },
  },
};

let _dailyQuestIds: Set<number> | null = null;
async function getDailyQuestIds(): Promise<Set<number>> {
  if (_dailyQuestIds) return _dailyQuestIds;
  const quests = await db.select({ id: questsTable.id, questType: questsTable.questType }).from(questsTable);
  _dailyQuestIds = new Set(
    quests
      .filter((q) => (REGISTRY[q.questType]?.category ?? "daily") === "daily")
      .map((q) => q.id),
  );
  return _dailyQuestIds;
}

export function getQuestDef(questType: string): QuestTypeDef | null {
  return REGISTRY[questType] ?? null;
}

export function getPeriodKey(category: QuestCategory): string {
  return category === "weekly" ? getISOWeekKey() : getDailyKey();
}

export async function computeProgress(
  questType: string,
  user: User,
): Promise<number> {
  const def = REGISTRY[questType];
  if (!def) return 0;
  return def.computeProgress(user);
}

// ---------- Claimed check ----------

export async function isProgressClaimed(progressId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "quest"),
        eq(transactionsTable.relatedId, String(progressId)),
      ),
    )
    .limit(1);
  return !!row;
}

// ---------- Seed ----------

interface SeedQuest {
  title: string;
  description: string;
  reward: number;
  questType: string;
  target: number;
}

const SEED_QUESTS: SeedQuest[] = [
  // Existing types — only seeded if title not already present
  { title: "Mine Today", description: "Claim your mining reward today", reward: 15, questType: "mine", target: 1 },
  { title: "Complete a Task", description: "Complete any task today", reward: 20, questType: "complete_task", target: 1 },
  { title: "Invite a Friend", description: "Invite at least one friend to HustleCoin", reward: 25, questType: "invite_friend", target: 1 },
  // New types
  { title: "Login Streak", description: "Maintain a 7-day login streak", reward: 100, questType: "login_streak", target: 7 },
  { title: "Earn HP This Week", description: "Earn 500 HP this week", reward: 200, questType: "earn_hp", target: 500 },
  { title: "Weekly Challenge", description: "Complete 3 different daily quests this week", reward: 300, questType: "weekly_challenge", target: 3 },
];

export async function ensureSeedQuests(): Promise<void> {
  const existing = await db.select({ title: questsTable.title }).from(questsTable);
  const existingTitles = new Set(existing.map((q) => q.title.trim().toLowerCase()));
  const missing = SEED_QUESTS.filter((q) => !existingTitles.has(q.title.toLowerCase()));
  if (missing.length === 0) return;

  await db.insert(questsTable).values(
    missing.map((q) => ({
      title: q.title,
      description: q.description,
      reward: q.reward,
      questType: q.questType,
      target: q.target,
    })),
  );
  // Invalidate cached daily quest ids after seeding
  _dailyQuestIds = null;
}
