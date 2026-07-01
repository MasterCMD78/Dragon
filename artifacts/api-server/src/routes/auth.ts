import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateTelegramInitData } from "../lib/telegram";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const IS_DEV = process.env.NODE_ENV !== "production";

router.post(
  "/auth/telegram",
  async (req: Request, res: Response): Promise<void> => {
    const { initData, referralCode } = req.body as {
      initData?: string;
      referralCode?: string | null;
    };

    if (!initData || typeof initData !== "string") {
      res.status(400).json({ error: "initData is required" });
      return;
    }

    if (!BOT_TOKEN) {
      res.status(500).json({ error: "Bot token not configured" });
      return;
    }

    let telegramUser: ReturnType<typeof validateTelegramInitData>["user"];
    let startParam: string | undefined;

    try {
      if (IS_DEV && initData === "dev_bypass") {
        telegramUser = {
          id: 999999999,
          first_name: "Dev",
          last_name: "User",
          username: "devuser",
        };
      } else {
        const parsed = validateTelegramInitData(initData, BOT_TOKEN);
        telegramUser = parsed.user;
        startParam = parsed.start_param;
      }
    } catch (err) {
      req.log.warn({ err }, "Invalid Telegram initData");
      res.status(401).json({ error: "Invalid Telegram authentication data" });
      return;
    }

    const telegramId = String(telegramUser.id);

    // Find existing user
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      // referralCode param OR start_param from Telegram is the referrer's telegram_id
      const referrerTelegramId = referralCode ?? startParam ?? null;

      // Validate the referrer exists and is not the same user
      let verifiedReferrer: string | null = null;
      if (referrerTelegramId && referrerTelegramId !== telegramId) {
        const [referrer] = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(eq(usersTable.telegramId, referrerTelegramId))
          .limit(1);
        if (referrer) {
          verifiedReferrer = referrer.telegramId;
        }
      }

      const [created] = await db
        .insert(usersTable)
        .values({
          telegramId,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name ?? null,
          username: telegramUser.username ?? "",
          languageCode: telegramUser.language_code ?? null,
          referredBy: verifiedReferrer,
        })
        .returning();

      user = created;
      req.log.info({ userId: user.id, telegramId }, "New user registered");
    } else {
      // Update profile fields in case they changed in Telegram
      const [updated] = await db
        .update(usersTable)
        .set({
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name ?? null,
          username: telegramUser.username ?? user.username,
          lastActive: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated;
      req.log.info({ userId: user.id, telegramId }, "Existing user logged in");
    }

    req.session.userId = user.id;

    res.json({
      user: serializeUser(user),
      isNewUser,
    });
  },
);

router.get(
  "/auth/me",
  requireAuth,
  (req: Request, res: Response): void => {
    const user = (
      req as Request & { currentUser: typeof usersTable.$inferSelect }
    ).currentUser;
    res.json(serializeUser(user));
  },
);

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

export function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName ?? null,
    balance: user.balance,
    level: user.level,
    streak: user.streak,
    totalMines: user.totalMines,
    referredBy: user.referredBy ?? null,
    // Referral code = telegram ID (used as start_param in bot links)
    referralCode: user.telegramId,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    joinDate: user.joinDate.toISOString(),
    lastMine: user.lastMine?.toISOString() ?? null,
  };
}

export default router;
