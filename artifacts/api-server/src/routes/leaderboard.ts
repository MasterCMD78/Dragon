import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, desc, count, sql, gt, and, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

function parsePageParams(query: Record<string, unknown>) {
  const limit = Math.min(
    Math.max(parseInt(String(query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(parseInt(String(query.offset ?? "0"), 10) || 0, 0);
  return { limit, offset };
}

// GET /leaderboard/global — rank by HP balance
router.get(
  "/leaderboard/global",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { limit, offset } = parsePageParams(req.query);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          telegramId: usersTable.telegramId,
          username: usersTable.username,
          firstName: usersTable.firstName,
          level: usersTable.level,
          balance: usersTable.balance,
        })
        .from(usersTable)
        .where(eq(usersTable.isBanned, false))
        .orderBy(desc(usersTable.balance), desc(usersTable.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(usersTable)
        .where(eq(usersTable.isBanned, false)),
    ]);

    res.json({
      entries: rows.map((r, i) => ({ rank: offset + i + 1, ...r })),
      total: Number(total),
    });
  },
);

// GET /leaderboard/mining — rank by total mines then streak
router.get(
  "/leaderboard/mining",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { limit, offset } = parsePageParams(req.query);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          telegramId: usersTable.telegramId,
          username: usersTable.username,
          firstName: usersTable.firstName,
          totalMines: usersTable.totalMines,
          streak: usersTable.streak,
        })
        .from(usersTable)
        .where(and(eq(usersTable.isBanned, false), gt(usersTable.totalMines, 0)))
        .orderBy(desc(usersTable.totalMines), desc(usersTable.streak), desc(usersTable.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(usersTable)
        .where(and(eq(usersTable.isBanned, false), gt(usersTable.totalMines, 0))),
    ]);

    res.json({
      entries: rows.map((r, i) => ({ rank: offset + i + 1, ...r })),
      total: Number(total),
    });
  },
);

// GET /leaderboard/referrals — rank by referral count then total HP earned
router.get(
  "/leaderboard/referrals",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const { limit, offset } = parsePageParams(req.query);

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          telegramId: usersTable.telegramId,
          username: usersTable.username,
          firstName: usersTable.firstName,
          totalReferrals: sql<number>`count(${referralsTable.id})::int`,
          totalReferralHp: sql<number>`coalesce(sum(${referralsTable.referrerHpEarned}), 0)::int`,
        })
        .from(usersTable)
        .innerJoin(
          referralsTable,
          eq(referralsTable.referrerTelegramId, usersTable.telegramId),
        )
        .where(eq(usersTable.isBanned, false))
        .groupBy(
          usersTable.id,
          usersTable.telegramId,
          usersTable.username,
          usersTable.firstName,
        )
        .orderBy(
          sql`count(${referralsTable.id}) desc`,
          sql`coalesce(sum(${referralsTable.referrerHpEarned}), 0) desc`,
        )
        .limit(limit)
        .offset(offset),
      db
        .select({
          total: sql<number>`count(distinct ${referralsTable.referrerTelegramId})::int`,
        })
        .from(referralsTable),
    ]);

    res.json({
      entries: rows.map((r, i) => ({ rank: offset + i + 1, ...r })),
      total: Number(total),
    });
  },
);

// GET /leaderboard/me — current user's rank on all 3 boards
router.get(
  "/leaderboard/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const [globalRankRow, miningRankRow, myRefRow] = await Promise.all([
      // Global rank: count non-banned users with a higher balance
      db
        .select({ rank: sql<number>`count(*)::int + 1` })
        .from(usersTable)
        .where(and(gt(usersTable.balance, user.balance), eq(usersTable.isBanned, false))),

      // Mining rank: count users ranked above (more mines, or equal mines + higher streak)
      db
        .select({ rank: sql<number>`count(*)::int + 1` })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.isBanned, false),
            or(
              gt(usersTable.totalMines, user.totalMines),
              and(
                eq(usersTable.totalMines, user.totalMines),
                gt(usersTable.streak, user.streak),
              ),
            ),
          ),
        ),

      // My referral stats
      db
        .select({
          totalReferrals: sql<number>`count(*)::int`,
          totalReferralHp: sql<number>`coalesce(sum(${referralsTable.referrerHpEarned}), 0)::int`,
        })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, user.telegramId)),
    ]);

    const myReferralCount = myRefRow[0]?.totalReferrals ?? 0;
    const myReferralHp = myRefRow[0]?.totalReferralHp ?? 0;

    // Referral rank: count referrers whose referral count exceeds mine
    const [refRankRow] = await db
      .select({ rank: sql<number>`count(*)::int + 1` })
      .from(
        db
          .select({ referrerTelegramId: referralsTable.referrerTelegramId })
          .from(referralsTable)
          .groupBy(referralsTable.referrerTelegramId)
          .having(sql`count(*) > ${myReferralCount}`)
          .as("sub"),
      );

    res.json({
      globalRank: globalRankRow[0]?.rank ?? 1,
      miningRank: miningRankRow[0]?.rank ?? 1,
      referralRank: refRankRow?.rank ?? 1,
      balance: user.balance,
      totalMines: user.totalMines,
      streak: user.streak,
      totalReferrals: Number(myReferralCount),
      totalReferralHp: Number(myReferralHp),
    });
  },
);

export default router;
