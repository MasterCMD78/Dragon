import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, referralEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateTelegramInitData } from "../lib/telegram";
import { requireAuth } from "../middlewares/auth";
import { authLimiter } from "../middlewares/rate-limit";
import { processReferralInTx } from "../lib/referral-engine";
import { checkAchievementsAfterEvent } from "../lib/achievement-engine";

const router: IRouter = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// dev_bypass is only available when explicitly opted-in via ALLOW_DEV_BYPASS=true,
// regardless of NODE_ENV — prevents accidental auth bypass from config drift.
const ALLOW_DEV_BYPASS = process.env.ALLOW_DEV_BYPASS === "true";

// ── Super Admin ────────────────────────────────────────────────────────────
// This Telegram ID is permanently recognised as the Founder / Super Admin.
// The status is repaired automatically on every login — it can never be
// revoked through the admin panel and does not depend on manual DB edits.
const SUPER_ADMIN_TELEGRAM_ID = "7035629762";

router.post(
  "/auth/telegram",
  authLimiter,
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
      if (telegramId === SUPER_ADMIN_TELEGRAM_ID) {
        // ── Super Admin: always repair isAdmin + isBanned, bypass ban gate ──
        const wasBanned = user.isBanned;
        const wasNotAdmin = !user.isAdmin;
        const [repaired] = await db
          .update(usersTable)
          .set({
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name ?? null,
            username: telegramUser.username ?? user.username,
            lastActive: new Date(),
            isAdmin: true,
            isBanned: false,
          })
          .where(eq(usersTable.id, user.id))
          .returning();
        user = repaired;
        if (wasBanned || wasNotAdmin) {
          req.log.warn(
            { telegramId, wasBanned, wasNotAdmin },
            "Super Admin status repaired on login",
          );
        }
      } else {
        // ── Normal users: reject if banned ──────────────────────────────────
        if (user.isBanned) {
          res.status(403).json({
            error: "ACCOUNT_BANNED",
            message: "Your HustleCoin account has been suspended.",
            appealAllowed: true,
          });
          return;
        }

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
      }

      req.log.info({ userId: user.id, telegramId }, "Existing user logged in");

      void checkAchievementsAfterEvent(user.telegramId, "login").catch((err) => {
        req.log.warn({ err }, "Achievement check failed after login");
      });
    } else {
      // ── New user — resolve referrer, then run everything in one transaction ─
      isNewUser = true;

      // The referral payload comes from (in priority order):
      //   1. Telegram deep-link start_param embedded in initData
      //      (present when app is opened via t.me/Bot/App?startapp=<id> or
      //       t.me/Bot?start=<id> for returning users)
      //   2. Explicit referralCode sent by the frontend from initDataUnsafe
      //      (belt-and-suspenders: frontend sends initDataUnsafe.start_param)
      const candidateReferrerId = startParam ?? referralCode ?? null;

      req.log.info(
        { telegramId, startParam, referralCode, candidateReferrerId },
        "New user referral candidate resolved",
      );

      // Validate: referrer must exist and must not be the joining user
      let verifiedReferrerId: string | null = null;
      let referralSource: string | null = null;

      if (candidateReferrerId && candidateReferrerId !== telegramId) {
        const [referrer] = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(eq(usersTable.telegramId, candidateReferrerId))
          .limit(1);
        if (referrer) {
          verifiedReferrerId = referrer.telegramId;
          referralSource = startParam ? "start_param" : "referral_code_body";
        } else {
          req.log.warn(
            { telegramId, candidateReferrerId },
            "Referral candidate not found in DB — no referral applied",
          );
          // Log the miss for production debugging
          void db.insert(referralEventsTable).values({
            referrerTelegramId: candidateReferrerId,
            refereeTelegramId: telegramId,
            step: "referrer_lookup",
            result: "not_found",
            message: "Referrer telegram_id not found in users table",
            source: startParam ? "start_param" : "referral_code_body",
          }).catch(() => {});
        }
      } else if (!candidateReferrerId) {
        req.log.info(
          { telegramId },
          "New user has no referral code — organic signup",
        );
        // Log organic signups for funnel analysis
        void db.insert(referralEventsTable).values({
          referrerTelegramId: null,
          refereeTelegramId: telegramId,
          step: "referral_candidate",
          result: "none",
          message: "No start_param or referralCode — organic signup",
          source: "none",
        }).catch(() => {});
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
            // Permanently grant Super Admin on account creation
            isAdmin: telegramId === SUPER_ADMIN_TELEGRAM_ID,
          })
          .returning();

        if (verifiedReferrerId) {
          await processReferralInTx(
            tx,
            verifiedReferrerId,
            { id: created.id, telegramId: created.telegramId, balance: created.balance },
            referralSource ?? undefined,
          );

          // Re-read the user so the returned balance reflects the welcome bonus
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
        { userId: user.id, telegramId, referredBy: verifiedReferrerId, referralSource },
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
