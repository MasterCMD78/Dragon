import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, gte, desc, count, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

function filterStart(filter: string): Date | null {
  const now = new Date();
  switch (filter) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    default:
      return null;
  }
}

// GET /wallet/transactions
router.get(
  "/wallet/transactions",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const {
      filter = "all",
      type = "",
      search = "",
      limit: limitStr = "20",
      offset: offsetStr = "0",
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 20, 50);
    const offset = parseInt(offsetStr, 10) || 0;

    const conditions: ReturnType<typeof eq>[] = [
      eq(transactionsTable.telegramId, user.telegramId) as ReturnType<typeof eq>,
    ];

    const since = filterStart(filter);
    if (since) {
      conditions.push(gte(transactionsTable.createdAt, since) as ReturnType<typeof eq>);
    }

    if (type.trim()) {
      conditions.push(eq(transactionsTable.type, type.trim()) as ReturnType<typeof eq>);
    }

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(transactionsTable.description, s),
          ilike(transactionsTable.type, s),
        ) as ReturnType<typeof eq>,
      );
    }

    const where = and(...conditions);

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(transactionsTable)
        .where(where)
        .orderBy(desc(transactionsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(transactionsTable).where(where),
    ]);

    res.json({
      balance: user.balance,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        description: t.description,
        relatedId: t.relatedId ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      total: Number(total),
    });
  },
);

export default router;
