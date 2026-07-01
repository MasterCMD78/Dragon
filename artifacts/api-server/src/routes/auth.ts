import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateTelegramInitData } from "../lib/telegram";
import { generateReferralCode } from "../lib/referral";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const IS_DEV = process.env.NODE_ENV !== "production";

router.post("/auth/telegram", async (req: Request, res: Response): Promise<void> => {
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

  try {
    // In development, allow a test initData bypass for browser testing
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
    }
  } catch (err) {
    req.log.warn({ err }, "Invalid Telegram initData");
    res.status(401).json({ error: "Invalid Telegram authentication data" });
    return;
  }

  const telegramId = String(telegramUser.id);

  // Find or create user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .limit(1);

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const newReferralCode = generateReferralCode(telegramId);

    // Look up referrer if a referral code was provided
    let referredById: number | null = null;
    if (referralCode) {
      const [referrer] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, referralCode))
        .limit(1);
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const [created] = await db
      .insert(usersTable)
      .values({
        telegramId,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name ?? null,
        username: telegramUser.username ?? null,
        photoUrl: telegramUser.photo_url ?? null,
        referralCode: newReferralCode,
        referredById: referredById ?? undefined,
      })
      .returning();

    user = created;
    req.log.info({ userId: user.id, telegramId }, "New user registered");
  } else {
    // Update profile fields from Telegram in case they changed
    const [updated] = await db
      .update(usersTable)
      .set({
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name ?? null,
        username: telegramUser.username ?? null,
        photoUrl: telegramUser.photo_url ?? null,
      })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
    req.log.info({ userId: user.id, telegramId }, "Existing user logged in");
  }

  // Store in session
  req.session.userId = user.id;

  res.json({
    user: serializeUser(user),
    isNewUser,
  });
});

router.get("/auth/me", requireAuth, (req: Request, res: Response): void => {
  const user = (req as Request & { currentUser: typeof usersTable.$inferSelect }).currentUser;
  res.json(serializeUser(user));
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    hpBalance: Number(user.hpBalance),
    totalMined: Number(user.totalMined),
    referralCode: user.referralCode,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

export { serializeUser };
export default router;
