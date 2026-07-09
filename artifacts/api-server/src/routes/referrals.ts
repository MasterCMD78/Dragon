import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, desc, count, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

/**
 * Build the referral deep link for this user.
 *
 * Uses the Mini App direct link format (?startapp=) when
 * TELEGRAM_APP_SHORT_NAME is configured — this guarantees start_param is
 * included in initData for ALL users (new and returning) because the Mini App
 * opens directly, bypassing the bot-chat START flow that strips it.
 *
 * Falls back to the bot link format (?start=) when the app short name is
 * absent; this still works for returning users but loses start_param for
 * brand-new users who have never opened the bot before.
 */
function buildReferralLink(telegramId: string): string {
  const bot = process.env.TELEGRAM_BOT_USERNAME ?? "";
  if (!bot) return "";
  const appShortName = process.env.TELEGRAM_APP_SHORT_NAME ?? "";
  if (appShortName) {
    // Mini App direct link — always carries start_param
    return `https://t.me/${bot}/${appShortName}?startapp=${telegramId}`;
  }
  // Bot link fallback — works for returning users
  return `https://t.me/${bot}?start=${telegramId}`;
}

// GET /referrals/stats
router.get(
  "/referrals/stats",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const [row] = await db
      .select({
        totalReferred: count(),
        totalHpEarned: sum(referralsTable.referrerHpEarned),
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerTelegramId, user.telegramId));

    res.json({
      totalReferred: Number(row?.totalReferred ?? 0),
      totalHpEarned: Number(row?.totalHpEarned ?? 0),
      referralCode: user.telegramId,
      referralLink: buildReferralLink(user.telegramId),
    });
  },
);

// GET /referrals/users
router.get(
  "/referrals/users",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 50);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: referralsTable.id,
          refereeTelegramId: referralsTable.refereeTelegramId,
          hpEarned: referralsTable.referrerHpEarned,
          joinedAt: referralsTable.createdAt,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          username: usersTable.username,
        })
        .from(referralsTable)
        .leftJoin(
          usersTable,
          eq(referralsTable.refereeTelegramId, usersTable.telegramId),
        )
        .where(eq(referralsTable.referrerTelegramId, user.telegramId))
        .orderBy(desc(referralsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, user.telegramId)),
    ]);

    res.json({
      entries: rows.map((r) => ({
        id: r.id,
        refereeTelegramId: r.refereeTelegramId,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        username: r.username ?? null,
        hpEarned: r.hpEarned,
        joinedAt: r.joinedAt.toISOString(),
      })),
      total: Number(total),
    });
  },
);

// GET /referrals/rewards
router.get(
  "/referrals/rewards",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 50);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: referralsTable.id,
          refereeTelegramId: referralsTable.refereeTelegramId,
          hpEarned: referralsTable.referrerHpEarned,
          earnedAt: referralsTable.createdAt,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          username: usersTable.username,
        })
        .from(referralsTable)
        .leftJoin(
          usersTable,
          eq(referralsTable.refereeTelegramId, usersTable.telegramId),
        )
        .where(eq(referralsTable.referrerTelegramId, user.telegramId))
        .orderBy(desc(referralsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, user.telegramId)),
    ]);

    res.json({
      entries: rows.map((r) => ({
        id: r.id,
        refereeTelegramId: r.refereeTelegramId,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        username: r.username ?? null,
        hpEarned: r.hpEarned,
        earnedAt: r.earnedAt.toISOString(),
      })),
      total: Number(total),
    });
  },
);

export default router;
