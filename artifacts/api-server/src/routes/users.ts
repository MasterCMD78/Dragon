import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
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

    const [{ totalReferrals }] = await db
      .select({ totalReferrals: count() })
      .from(referralsTable)
      .where(eq(referralsTable.referrerTelegramId, user.telegramId));

    res.json({
      ...serializeUser(user),
      totalReferrals: Number(totalReferrals),
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

    const [{ totalReferrals }] = await db
      .select({ totalReferrals: count() })
      .from(referralsTable)
      .where(eq(referralsTable.referrerTelegramId, user.telegramId));

    // Rank = users with a higher balance + 1
    const [{ usersAhead }] = await db
      .select({ usersAhead: count() })
      .from(usersTable)
      .where(gt(usersTable.balance, user.balance));

    const globalRank = Number(usersAhead) + 1;

    // 24-hour mining cooldown
    let canMineNow = true;
    let nextMineAt: string | null = null;

    if (user.lastMine) {
      const cooldownMs = 24 * 60 * 60 * 1000;
      const nextMine = new Date(user.lastMine.getTime() + cooldownMs);
      if (nextMine > new Date()) {
        canMineNow = false;
        nextMineAt = nextMine.toISOString();
      }
    }

    res.json({
      balance: user.balance,
      streak: user.streak,
      totalMines: user.totalMines,
      totalReferrals: Number(totalReferrals),
      globalRank,
      canMineNow,
      nextMineAt,
    });
  },
);

export default router;
