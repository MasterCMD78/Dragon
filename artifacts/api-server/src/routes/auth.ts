import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateTelegramInitData } from "../lib/telegram";
import { requireAuth } from "../middlewares/auth";
import { processReferralInTx } from "../lib/referral-engine";
import { checkAchievementsAfterEvent } from "../lib/achievement-engine";

const router: IRouter = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// dev_bypass is only available when explicitly opted-in via ALLOW_DEV_BYPASS=true,
// regardless of NODE_ENV — prevents accidental auth bypass from config drift.
const ALLOW_DEV_BYPASS = process.env.ALLOW_DEV_BYPASS === "true";

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
      if (ALLOW_DEV_BYPASS && initData.startsWith("dev_bypass")) {
        // dev_bypass            → standard dev user 999999999
        // dev_bypass:123456789  → custom ID for testing
        const parts = initData.split(":");
        const userId = parts[1] ? parseInt(parts[1], 10) : 999999999;
        telegramUser = {
          id: userId,
          first_name: `Test_${userId}`,
          last_name: "User",
          username: `testuser_${userId}`,
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

    // ── Existing user fast-path (no referral logic) ──────────────────────────
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    let isNewUser = false;

    if (user) {
      // Update mutable profile fields in case they changed in Telegram
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

      void checkAchievementsAfterEvent(user.telegramId, "login").catch((err) => {
        req.log.warn({ err }, "Achievement check failed after login");
      });
    } else {
      // ── New user — resolve referrer, then run everything in one transaction ─
      isNewUser = true;

      // The referral payload comes from:
      //   1. Telegram deep-link start_param (e.g. t.me/Bot?start=<telegramId>)
      //   2. Explicit referralCode field in request body (fallback)
      const candidateReferrerId = startParam ?? referralCode ?? null;

      // Validate: referrer must exist and must not be the joining user
      let verifiedReferrerId: string | null = null;
      if (candidateReferrerId && candidateReferrerId !== telegramId) {
        const [referrer] = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(eq(usersTable.telegramId, candidateReferrerId))
          .limit(1);
        if (referrer) {
          verifiedReferrerId = referrer.telegramId;
        }
      }

      // Atomic: create user + award referral rewards (if any) in one transaction
      user = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(usersTable)
          .values({
            telegramId,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name ?? null,
            username: telegramUser.username ?? "",
            languageCode: telegramUser.language_code ?? null,
            referredBy: verifiedReferrerId,
          })
          .returning();

        if (verifiedReferrerId) {
          await processReferralInTx(tx, verifiedReferrerId, {
            id: created.id,
            telegramId: created.telegramId,
            balance: created.balance,
          });

          // Re-read the user so the returned balance reflects the +250 bonus
          const [withBonus] = await tx
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, created.id))
            .limit(1);
          return withBonus;
        }

        return created;
      });

      req.log.info(
        { userId: user.id, telegramId, referredBy: verifiedReferrerId },
        "New user registered",
      );

      void checkAchievementsAfterEvent(user.telegramId, "login").catch((err) => {
        req.log.warn({ err }, "Achievement check failed after new user registration");
      });

      if (verifiedReferrerId) {
        void checkAchievementsAfterEvent(verifiedReferrerId, "referral").catch((err) => {
          req.log.warn({ err }, "Achievement check failed for referrer");
        });
      }
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
