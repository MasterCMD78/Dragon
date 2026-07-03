import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  achievementsTable,
  achievementUnlocksTable,
  transactionsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_ENGINE_LAUNCH,
  loadCheckData,
  checkAchievementsAfterEvent,
  buildAchievementItem,
} from "../lib/achievement-engine";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };

// ---------------------------------------------------------------------------
// Shared helper: build the full list of achievement items for a user
// ---------------------------------------------------------------------------
async function buildAchievementList(telegramId: string) {
  const [allDbAchievements, existingUnlocks, data] = await Promise.all([
    db.select().from(achievementsTable),
    db
      .select()
      .from(achievementUnlocksTable)
      .where(eq(achievementUnlocksTable.telegramId, telegramId)),
    loadCheckData(telegramId, "all"),
  ]);

  // Fetch reward transactions for all unlock IDs in one query
  const rewardedIds = new Set<string>();
  if (existingUnlocks.length > 0) {
    const unlockIdStrings = existingUnlocks.map((u) => String(u.id));
    const txRows = await db
      .select({ relatedId: transactionsTable.relatedId })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.telegramId, telegramId),
          eq(transactionsTable.type, "achievement"),
          inArray(transactionsTable.relatedId, unlockIdStrings),
        ),
      );
    txRows.forEach((t) => {
      if (t.relatedId) rewardedIds.add(t.relatedId);
    });
  }

  const dbByTitle = new Map(allDbAchievements.map((a) => [a.title, a]));
  const unlockByAchievementId = new Map(
    existingUnlocks.map((u) => [u.achievementId, u]),
  );

  // Build item for every def that has a matching DB row
  return ACHIEVEMENT_DEFS.flatMap((def) => {
    const dbRow = dbByTitle.get(def.title);
    if (!dbRow) return []; // Not seeded yet — skip

    const unlock = unlockByAchievementId.get(dbRow.id) ?? null;
    return [buildAchievementItem(def, dbRow, unlock, rewardedIds, data)];
  });
}

// ---------------------------------------------------------------------------
// GET /achievements — list all achievements with the current user's status
// ---------------------------------------------------------------------------
router.get(
  "/achievements",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    try {
      const achievements = await buildAchievementList(user.telegramId);
      res.json({ achievements });
    } catch (err) {
      req.log.error({ err }, "Failed to list achievements");
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /achievements/:id — single achievement detail
// ---------------------------------------------------------------------------
router.get(
  "/achievements/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const achievementId = parseInt(req.params["id"] as string, 10);

    if (Number.isNaN(achievementId)) {
      res.status(400).json({ error: "Invalid achievement id" });
      return;
    }

    try {
      const [dbRow] = await db
        .select()
        .from(achievementsTable)
        .where(eq(achievementsTable.id, achievementId))
        .limit(1);

      if (!dbRow) {
        res.status(404).json({ error: "Achievement not found" });
        return;
      }

      const def = ACHIEVEMENT_DEFS.find((d) => d.title === dbRow.title);
      if (!def) {
        res.status(404).json({ error: "Achievement not in registry" });
        return;
      }

      const [unlock, data] = await Promise.all([
        db
          .select()
          .from(achievementUnlocksTable)
          .where(
            and(
              eq(achievementUnlocksTable.telegramId, user.telegramId),
              eq(achievementUnlocksTable.achievementId, achievementId),
            ),
          )
          .limit(1)
          .then(([r]) => r ?? null),
        loadCheckData(user.telegramId, "all"),
      ]);

      const rewardedIds = new Set<string>();
      if (unlock) {
        const [tx] = await db
          .select({ relatedId: transactionsTable.relatedId })
          .from(transactionsTable)
          .where(
            and(
              eq(transactionsTable.telegramId, user.telegramId),
              eq(transactionsTable.type, "achievement"),
              eq(transactionsTable.relatedId, String(unlock.id)),
            ),
          )
          .limit(1);
        if (tx?.relatedId) rewardedIds.add(tx.relatedId);
      }

      res.json(buildAchievementItem(def, dbRow, unlock, rewardedIds, data));
    } catch (err) {
      req.log.error({ err, achievementId }, "Failed to get achievement");
      res.status(500).json({ error: "Failed to fetch achievement" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /achievements/check — run a full achievement sweep for the current user
// ---------------------------------------------------------------------------
router.post(
  "/achievements/check",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    try {
      const newUnlocks = await checkAchievementsAfterEvent(user.telegramId, "all");

      req.log.info(
        { userId: user.id, newUnlockCount: newUnlocks.length },
        "Achievement check completed",
      );

      res.json({
        totalChecked: ACHIEVEMENT_DEFS.length,
        newUnlocks,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to run achievement check");
      res.status(500).json({ error: "Failed to run achievement check" });
    }
  },
);

export default router;
