import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, miningLogsTable, transactionsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  calcReward,
  calcMiningRate,
  buildMiningDescription,
  secondsRemaining,
  SESSION_DURATION_MS,
} from "../lib/mining";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

/** Build the MiningStatus response object from a user row. */
function buildStatus(user: typeof usersTable.$inferSelect) {
  const session = user.miningSessionStart;
  const nextStreak = user.streak + 1;
  const { total: estimatedReward } = calcReward(nextStreak);
  const rate = calcMiningRate(nextStreak);

  if (!session) {
    return {
      state: "idle" as const,
      sessionStartedAt: null,
      sessionEndsAt: null,
      secondsRemaining: null,
      balance: user.balance,
      streak: user.streak,
      totalMines: user.totalMines,
      miningRate: rate,
      estimatedReward,
      lastClaimedAt: user.lastMine?.toISOString() ?? null,
    };
  }

  const secs = secondsRemaining(session);
  const endsAt = new Date(session.getTime() + SESSION_DURATION_MS);

  return {
    state: (secs > 0 ? "mining" : "claimable") as "mining" | "claimable",
    sessionStartedAt: session.toISOString(),
    sessionEndsAt: endsAt.toISOString(),
    secondsRemaining: secs > 0 ? secs : 0,
    balance: user.balance,
    streak: user.streak,
    totalMines: user.totalMines,
    miningRate: rate,
    estimatedReward,
    lastClaimedAt: user.lastMine?.toISOString() ?? null,
  };
}

// GET /mining/status
router.get(
  "/mining/status",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    res.json(buildStatus(user));
  },
);

// POST /mining/start
router.post(
  "/mining/start",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    // Prevent starting if a session is already active (not yet claimable)
    if (user.miningSessionStart) {
      const secs = secondsRemaining(user.miningSessionStart);
      if (secs > 0) {
        res.status(400).json({ error: "Mining session already in progress" });
        return;
      }
      // Session is complete but not claimed — must claim first
      res.status(400).json({ error: "Please claim your rewards before starting a new session" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ miningSessionStart: new Date(), lastActive: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    req.log.info({ userId: user.id }, "Mining session started");
    res.json(buildStatus(updated));
  },
);

// POST /mining/claim
router.post(
  "/mining/claim",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    if (!user.miningSessionStart) {
      res.status(400).json({ error: "No active mining session" });
      return;
    }

    const secs = secondsRemaining(user.miningSessionStart);
    if (secs > 0) {
      res.status(400).json({ error: "Mining session not complete yet" });
      return;
    }

    // Streak logic: if last mine was within 48h, increment; otherwise reset to 1
    let newStreak = 1;
    if (user.lastMine) {
      const hoursSinceLastMine = (Date.now() - user.lastMine.getTime()) / (60 * 60 * 1000);
      if (hoursSinceLastMine <= 48) {
        newStreak = user.streak + 1;
      }
    }

    const { hpEarned, bonusHp, total } = calcReward(newStreak);
    const newBalance = user.balance + total;
    const newTotalMines = user.totalMines + 1;
    const claimedAt = new Date();

    // Atomic update: balance, streak, total_mines, last_mine, clear session
    const [updated] = await db
      .update(usersTable)
      .set({
        balance: newBalance,
        streak: newStreak,
        totalMines: newTotalMines,
        lastMine: claimedAt,
        miningSessionStart: null,
        lastActive: claimedAt,
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    // Insert mining log
    const [log] = await db
      .insert(miningLogsTable)
      .values({
        telegramId: user.telegramId,
        hpEarned,
        bonusHp,
        streak: newStreak,
      })
      .returning();

    // Insert transaction record
    await db.insert(transactionsTable).values({
      telegramId: user.telegramId,
      type: "mining",
      amount: total,
      balanceBefore: user.balance,
      balanceAfter: newBalance,
      description: buildMiningDescription(bonusHp, newStreak),
      relatedId: String(log.id),
    });

    req.log.info(
      { userId: user.id, reward: total, streak: newStreak },
      "Mining rewards claimed",
    );

    res.json({
      hpEarned,
      bonusHp,
      totalReward: total,
      newBalance: updated.balance,
      newStreak: updated.streak,
      newTotalMines: updated.totalMines,
    });
  },
);

// GET /mining/history
router.get(
  "/mining/history",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 50);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const [entries, [{ total }]] = await Promise.all([
      db
        .select()
        .from(miningLogsTable)
        .where(eq(miningLogsTable.telegramId, user.telegramId))
        .orderBy(desc(miningLogsTable.minedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(miningLogsTable)
        .where(eq(miningLogsTable.telegramId, user.telegramId)),
    ]);

    res.json({
      entries: entries.map((e) => ({
        id: e.id,
        hpEarned: e.hpEarned,
        bonusHp: e.bonusHp,
        totalHp: e.hpEarned + e.bonusHp,
        streak: e.streak,
        minedAt: e.minedAt.toISOString(),
      })),
      total: Number(total),
    });
  },
);

export default router;
