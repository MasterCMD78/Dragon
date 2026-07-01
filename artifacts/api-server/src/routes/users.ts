import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, count, gt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { serializeUser } from "./auth";

const router: IRouter = Router();

router.get(
  "/users/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (
      req as Request & { currentUser: typeof usersTable.$inferSelect }
    ).currentUser;

    const [{ referralCount }] = await db
      .select({ referralCount: count() })
      .from(usersTable)
      .where(eq(usersTable.referredById, user.id));

    res.json({
      ...serializeUser(user),
      miningStreak: user.miningStreak,
      totalReferrals: Number(referralCount),
      lastMinedAt: user.lastMinedAt?.toISOString() ?? null,
    });
  },
);

router.get(
  "/users/stats",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (
      req as Request & { currentUser: typeof usersTable.$inferSelect }
    ).currentUser;

    // Count referrals
    const [{ referralCount }] = await db
      .select({ referralCount: count() })
      .from(usersTable)
      .where(eq(usersTable.referredById, user.id));

    // Rank = number of users with more HP than current user + 1
    const [{ usersAhead }] = await db
      .select({ usersAhead: count() })
      .from(usersTable)
      .where(gt(usersTable.hpBalance, user.hpBalance));

    const globalRank = Number(usersAhead) + 1;

    // 24-hour mining cooldown
    let canMineNow = true;
    let nextMineAt: string | null = null;

    if (user.lastMinedAt) {
      const cooldownMs = 24 * 60 * 60 * 1000;
      const nextMine = new Date(user.lastMinedAt.getTime() + cooldownMs);
      if (nextMine > new Date()) {
        canMineNow = false;
        nextMineAt = nextMine.toISOString();
      }
    }

    res.json({
      hpBalance: Number(user.hpBalance),
      totalMined: Number(user.totalMined),
      miningStreak: user.miningStreak,
      totalReferrals: Number(referralCount),
      globalRank,
      canMineNow,
      nextMineAt,
    });
  },
);

export default router;
