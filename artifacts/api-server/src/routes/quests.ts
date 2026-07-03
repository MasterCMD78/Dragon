import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  questsTable,
  questProgressTable,
  transactionsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  computeProgress,
  getQuestDef,
  getPeriodKey,
  isProgressClaimed,
  type QuestCategory,
} from "../lib/quests";
import { checkAchievementsAfterEvent } from "../lib/achievement-engine";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };
type Quest = typeof questsTable.$inferSelect;
type QuestProgress = typeof questProgressTable.$inferSelect;

interface QuestWithState {
  id: number;
  title: string;
  description: string;
  reward: number;
  questType: string;
  category: QuestCategory;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  periodKey: string;
  progressId: number | null;
}

async function buildQuestState(
  quest: Quest,
  telegramId: string,
  user: typeof usersTable.$inferSelect,
): Promise<QuestWithState> {
  const def = getQuestDef(quest.questType);
  const category: QuestCategory = def?.category ?? "daily";
  const periodKey = getPeriodKey(category);

  const [progressRow] = await db
    .select()
    .from(questProgressTable)
    .where(
      and(
        eq(questProgressTable.questId, quest.id),
        eq(questProgressTable.telegramId, telegramId),
        eq(questProgressTable.date, periodKey),
      ),
    )
    .limit(1);

  // Live progress from source data (for accurate display without requiring explicit /progress call)
  const liveProgress = await computeProgress(quest.questType, user);
  const storedProgress = progressRow?.progress ?? 0;
  const displayProgress = Math.max(liveProgress, storedProgress);
  const completedBool = displayProgress >= quest.target;

  const claimed =
    progressRow && completedBool
      ? await isProgressClaimed(progressRow.id)
      : false;

  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    reward: quest.reward,
    questType: quest.questType,
    category,
    target: quest.target,
    progress: Math.min(displayProgress, quest.target),
    completed: completedBool,
    claimed,
    periodKey,
    progressId: progressRow?.id ?? null,
  };
}

// GET /quests — list all quests with current user's state
router.get(
  "/quests",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const quests = await db
      .select()
      .from(questsTable)
      .orderBy(questsTable.id);

    const results = await Promise.all(
      quests.map((q) => buildQuestState(q, user.telegramId, user)),
    );

    res.json({ quests: results });
  },
);

// GET /quests/:id — single quest detail
router.get(
  "/quests/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    const [quest] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, questId))
      .limit(1);

    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    const state = await buildQuestState(quest, user.telegramId, user);
    res.json(state);
  },
);

// POST /quests/:id/start — ensure a progress row exists for the current period
router.post(
  "/quests/:id/start",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    const [quest] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, questId))
      .limit(1);

    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    const def = getQuestDef(quest.questType);
    const category: QuestCategory = def?.category ?? "daily";
    const periodKey = getPeriodKey(category);

    const [existing] = await db
      .select()
      .from(questProgressTable)
      .where(
        and(
          eq(questProgressTable.questId, questId),
          eq(questProgressTable.telegramId, user.telegramId),
          eq(questProgressTable.date, periodKey),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(questProgressTable).values({
        questId,
        telegramId: user.telegramId,
        progress: 0,
        completed: 0,
        date: periodKey,
      });
    }

    const state = await buildQuestState(quest, user.telegramId, user);
    res.json(state);
  },
);

// POST /quests/:id/progress — recompute and persist current progress
router.post(
  "/quests/:id/progress",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    const [quest] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, questId))
      .limit(1);

    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    const def = getQuestDef(quest.questType);
    const category: QuestCategory = def?.category ?? "daily";
    const periodKey = getPeriodKey(category);

    const liveProgress = await computeProgress(quest.questType, user);
    const completedInt = liveProgress >= quest.target ? 1 : 0;

    const [existing] = await db
      .select()
      .from(questProgressTable)
      .where(
        and(
          eq(questProgressTable.questId, questId),
          eq(questProgressTable.telegramId, user.telegramId),
          eq(questProgressTable.date, periodKey),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(questProgressTable)
        .set({
          progress: liveProgress,
          completed: completedInt,
          updatedAt: new Date(),
        })
        .where(eq(questProgressTable.id, existing.id));
    } else {
      await db.insert(questProgressTable).values({
        questId,
        telegramId: user.telegramId,
        progress: liveProgress,
        completed: completedInt,
        date: periodKey,
      });
    }

    const state = await buildQuestState(quest, user.telegramId, user);
    res.json(state);
  },
);

// POST /quests/:id/claim — atomically claim reward for a completed quest
router.post(
  "/quests/:id/claim",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const authedUser = (req as AuthedRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    const [quest] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, questId))
      .limit(1);

    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    const def = getQuestDef(quest.questType);
    const category: QuestCategory = def?.category ?? "daily";
    const periodKey = getPeriodKey(category);

    try {
      const result = await db.transaction(async (tx) => {
        // Lock user row for the duration — prevents concurrent double-claims
        const [lockedUser] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, authedUser.id))
          .for("update");

        // Re-compute live progress inside transaction to validate claim
        const liveProgress = await computeProgress(quest.questType, lockedUser);
        if (liveProgress < quest.target) {
          return { notClaimable: true as const, reason: "Quest not completed yet" };
        }

        // Find or create the progress row
        const [progressRow] = await tx
          .select()
          .from(questProgressTable)
          .where(
            and(
              eq(questProgressTable.questId, questId),
              eq(questProgressTable.telegramId, lockedUser.telegramId),
              eq(questProgressTable.date, periodKey),
            ),
          )
          .limit(1);

        let progressId: number;
        if (progressRow) {
          progressId = progressRow.id;
        } else {
          const [inserted] = await tx
            .insert(questProgressTable)
            .values({
              questId,
              telegramId: lockedUser.telegramId,
              progress: liveProgress,
              completed: 1,
              date: periodKey,
            })
            .returning();
          progressId = inserted.id;
        }

        // Duplicate claim guard — check inside the locked transaction
        const [existingTx] = await tx
          .select({ id: transactionsTable.id })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.type, "quest"),
              eq(transactionsTable.relatedId, String(progressId)),
            ),
          )
          .limit(1);

        if (existingTx) {
          return { notClaimable: true as const, reason: "Reward already claimed" };
        }

        // Mark completed in DB
        await tx
          .update(questProgressTable)
          .set({ completed: 1, progress: liveProgress, updatedAt: new Date() })
          .where(eq(questProgressTable.id, progressId));

        const newBalance = lockedUser.balance + quest.reward;

        await tx
          .update(usersTable)
          .set({ balance: newBalance })
          .where(eq(usersTable.id, lockedUser.id));

        await tx.insert(transactionsTable).values({
          telegramId: lockedUser.telegramId,
          type: "quest",
          amount: quest.reward,
          balanceBefore: lockedUser.balance,
          balanceAfter: newBalance,
          description: `Quest reward: ${quest.title}`,
          relatedId: String(progressId),
        });

        return {
          status: "claimed" as const,
          reward: quest.reward,
          newBalance,
        };
      });

      if ("notClaimable" in result) {
        res.status(400).json({ error: result.reason });
        return;
      }

      req.log.info({ userId: authedUser.id, questId }, "Quest reward claimed");
      res.json(result);

      void checkAchievementsAfterEvent(authedUser.telegramId, "quest").catch((err) => {
        req.log.warn({ err }, "Achievement check failed after quest claim");
      });
    } catch (err) {
      req.log.error({ err, questId }, "Failed to claim quest reward");
      res.status(500).json({ error: "Failed to claim quest reward" });
    }
  },
);

export default router;
