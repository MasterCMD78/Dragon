import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  tasksTable,
  taskCompletionsTable,
  transactionsTable,
  questsTable,
  questProgressTable,
  achievementsTable,
  achievementUnlocksTable,
  notificationsTable,
  announcementsTable,
  miningLogsTable,
  referralsTable,
  adminLogsTable,
  systemSettingsTable,
  SETTING_KEYS,
  SETTING_DEFAULTS,
} from "@workspace/db";
import {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  gte,
  lte,
  ilike,
  isNull,
  isNotNull,
  inArray,
  count,
  ne,
} from "drizzle-orm";
import { requireAdmin, type AdminRequest } from "../middlewares/admin";
import { checkAchievementsAfterEvent } from "../lib/achievement-engine";

const router: IRouter = Router();

// ── Super Admin ────────────────────────────────────────────────────────────
// This Telegram ID is permanently recognised as Founder / Super Admin.
// No admin action can ban this account or strip its admin privileges.
const SUPER_ADMIN_TELEGRAM_ID = "7035629762";

// ─── Utility ────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function thisWeekStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function writeAdminLog(
  adminTelegramId: string,
  action: string,
  targetTelegramId?: string,
  details?: string,
) {
  await db.insert(adminLogsTable).values({
    adminTelegramId,
    action,
    targetTelegramId,
    details: details ?? null,
  });
}

async function notifyUser(
  telegramId: string,
  title: string,
  message: string,
  type: string = "system",
) {
  await db.insert(notificationsTable).values({
    telegramId,
    title,
    message,
    type,
    read: false,
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

// GET /admin/stats
router.get(
  "/admin/stats",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const ts = todayStart();
    const [
      [{ totalUsers }],
      [{ activeToday }],
      [{ minesToday }],
      [{ totalHP }],
      [{ totalReferrals }],
      [{ pendingApprovals }],
      [{ totalAchievements }],
      [{ notifToday }],
    ] = await Promise.all([
      db.select({ totalUsers: count() }).from(usersTable),
      db
        .select({ activeToday: count() })
        .from(usersTable)
        .where(gte(usersTable.lastActive, ts)),
      db
        .select({ minesToday: count() })
        .from(miningLogsTable)
        .where(gte(miningLogsTable.minedAt, ts)),
      db
        .select({ totalHP: sql<number>`coalesce(sum(balance),0)` })
        .from(usersTable),
      db.select({ totalReferrals: count() }).from(referralsTable),
      db
        .select({ pendingApprovals: count() })
        .from(taskCompletionsTable)
        .where(eq(taskCompletionsTable.status, "pending")),
      db.select({ totalAchievements: count() }).from(achievementUnlocksTable),
      db
        .select({ notifToday: count() })
        .from(notificationsTable)
        .where(gte(notificationsTable.createdAt, ts)),
    ]);

    res.json({
      totalUsers,
      activeToday,
      minesToday,
      totalHPInCirculation: Number(totalHP),
      totalReferrals,
      pendingTaskApprovals: pendingApprovals,
      totalAchievementsUnlocked: totalAchievements,
      notificationsSentToday: notifToday,
    });
  },
);

// ─── User Management ─────────────────────────────────────────────────────────

// GET /admin/users — paginated + search + filters
router.get(
  "/admin/users",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      search = "",
      filter = "all",
      limit: limitStr = "30",
      offset: offsetStr = "0",
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(limitStr, 10) || 30, 100);
    const offset = parseInt(offsetStr, 10) || 0;
    const ts = todayStart();
    const ws = thisWeekStart();

    const conditions: ReturnType<typeof eq>[] = [];

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(usersTable.telegramId, s),
          ilike(usersTable.username, s),
          ilike(usersTable.firstName, s),
          ilike(usersTable.lastName!, s),
        ) as ReturnType<typeof eq>,
      );
    }

    switch (filter) {
      case "banned":
        conditions.push(eq(usersTable.isBanned, true) as ReturnType<typeof eq>);
        break;
      case "admin":
        conditions.push(eq(usersTable.isAdmin, true) as ReturnType<typeof eq>);
        break;
      case "active_today":
        conditions.push(gte(usersTable.lastActive, ts) as ReturnType<typeof eq>);
        break;
      case "inactive":
        conditions.push(lte(usersTable.lastActive, ts) as ReturnType<typeof eq>);
        break;
      case "joined_today":
        conditions.push(gte(usersTable.joinDate, ts) as ReturnType<typeof eq>);
        break;
      case "joined_week":
        conditions.push(gte(usersTable.joinDate, ws) as ReturnType<typeof eq>);
        break;
      case "referred":
        conditions.push(isNotNull(usersTable.referredBy) as ReturnType<typeof eq>);
        break;
      case "high_miners":
        conditions.push(gte(usersTable.totalMines, 10) as ReturnType<typeof eq>);
        break;
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, [{ total }]] = await Promise.all([
      db
        .select()
        .from(usersTable)
        .where(where)
        .orderBy(desc(usersTable.joinDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(usersTable)
        .where(where),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        telegramId: u.telegramId,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        balance: u.balance,
        level: u.level,
        streak: u.streak,
        totalMines: u.totalMines,
        joinDate: u.joinDate,
        lastActive: u.lastActive,
        isBanned: u.isBanned,
        isAdmin: u.isAdmin,
        referredBy: u.referredBy,
      })),
      total,
      limit,
      offset,
    });
  },
);

// GET /admin/users/:telegramId — full profile
router.get(
  "/admin/users/:telegramId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { telegramId } = req.params as { telegramId: string };

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [
      [{ tasksCompleted }],
      [{ questsCompleted }],
      [{ achievementsUnlocked }],
      [{ totalReferrals }],
      recentTx,
    ] = await Promise.all([
      db
        .select({ tasksCompleted: count() })
        .from(taskCompletionsTable)
        .where(
          and(
            eq(taskCompletionsTable.telegramId, telegramId),
            eq(taskCompletionsTable.status, "completed"),
          ),
        ),
      db
        .select({ questsCompleted: count() })
        .from(questProgressTable)
        .where(
          and(
            eq(questProgressTable.telegramId, telegramId),
            eq(questProgressTable.completed, 1),
          ),
        ),
      db
        .select({ achievementsUnlocked: count() })
        .from(achievementUnlocksTable)
        .where(eq(achievementUnlocksTable.telegramId, telegramId)),
      db
        .select({ totalReferrals: count() })
        .from(referralsTable)
        .where(eq(referralsTable.referrerTelegramId, telegramId)),
      db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.telegramId, telegramId))
        .orderBy(desc(transactionsTable.createdAt))
        .limit(10),
    ]);

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        level: user.level,
        streak: user.streak,
        totalMines: user.totalMines,
        lastMine: user.lastMine,
        joinDate: user.joinDate,
        lastActive: user.lastActive,
        isBanned: user.isBanned,
        isAdmin: user.isAdmin,
        referredBy: user.referredBy,
        languageCode: user.languageCode,
      },
      stats: {
        tasksCompleted,
        questsCompleted,
        achievementsUnlocked,
        totalReferrals,
      },
      recentTransactions: recentTx,
    });
  },
);

// POST /admin/users/:telegramId/hp — add or remove HP
router.post(
  "/admin/users/:telegramId/hp",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };
    const { amount, reason } = req.body as { amount: number; reason?: string };

    if (!amount || typeof amount !== "number" || amount === 0) {
      res.status(400).json({ error: "amount must be a non-zero number" });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [user] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.telegramId, telegramId))
          .for("update")
          .limit(1);

        if (!user) return { notFound: true };

        const newBalance = Math.max(0, user.balance + amount);
        await tx
          .update(usersTable)
          .set({ balance: newBalance })
          .where(eq(usersTable.telegramId, telegramId));

        const type = amount > 0 ? "admin_grant" : "admin_deduct";
        const description =
          reason ??
          (amount > 0
            ? `Admin granted ${amount} HP`
            : `Admin deducted ${Math.abs(amount)} HP`);

        await tx.insert(transactionsTable).values({
          telegramId,
          type,
          amount,
          balanceBefore: user.balance,
          balanceAfter: newBalance,
          description,
        });

        return { newBalance, balanceBefore: user.balance };
      });

      if ("notFound" in result) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const notifTitle =
        amount > 0 ? "HP Added by Admin" : "HP Deducted by Admin";
      const notifMsg =
        amount > 0
          ? `An admin added ${amount} HP to your account. New balance: ${result.newBalance} HP.`
          : `An admin deducted ${Math.abs(amount)} HP from your account. New balance: ${result.newBalance} HP.`;

      await Promise.all([
        notifyUser(telegramId, notifTitle, notifMsg, "system"),
        writeAdminLog(
          admin.telegramId,
          amount > 0 ? "grant_hp" : "deduct_hp",
          telegramId,
          `amount=${amount} reason=${reason ?? "none"}`,
        ),
      ]);

      res.json({ success: true, newBalance: result.newBalance });
    } catch (err) {
      req.log.error({ err }, "Admin HP adjustment failed");
      res.status(500).json({ error: "HP adjustment failed" });
    }
  },
);

// POST /admin/users/:telegramId/ban
router.post(
  "/admin/users/:telegramId/ban",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    if (telegramId === admin.telegramId) {
      res.status(400).json({ error: "Cannot ban yourself" });
      return;
    }

    if (telegramId === SUPER_ADMIN_TELEGRAM_ID) {
      res.status(403).json({ error: "Cannot ban the Super Admin" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db
      .update(usersTable)
      .set({ isBanned: true })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "ban_user", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/unban
router.post(
  "/admin/users/:telegramId/unban",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    await db
      .update(usersTable)
      .set({ isBanned: false })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "unban_user", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/make-admin
router.post(
  "/admin/users/:telegramId/make-admin",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    await db
      .update(usersTable)
      .set({ isAdmin: true })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "make_admin", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/remove-admin
router.post(
  "/admin/users/:telegramId/remove-admin",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    if (telegramId === admin.telegramId) {
      res.status(400).json({ error: "Cannot remove your own admin status" });
      return;
    }

    if (telegramId === SUPER_ADMIN_TELEGRAM_ID) {
      res.status(403).json({ error: "Cannot remove Super Admin privileges" });
      return;
    }

    await db
      .update(usersTable)
      .set({ isAdmin: false })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "remove_admin", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/reset/mining
router.post(
  "/admin/users/:telegramId/reset/mining",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    await db
      .update(usersTable)
      .set({ lastMine: null, miningSessionStart: null })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "reset_mining", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/reset/streak
router.post(
  "/admin/users/:telegramId/reset/streak",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };

    await db
      .update(usersTable)
      .set({ streak: 0 })
      .where(eq(usersTable.telegramId, telegramId));

    await writeAdminLog(admin.telegramId, "reset_streak", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/reset/tasks
router.post(
  "/admin/users/:telegramId/reset/tasks",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };
    const ts = todayStart();

    await db
      .delete(taskCompletionsTable)
      .where(
        and(
          eq(taskCompletionsTable.telegramId, telegramId),
          gte(taskCompletionsTable.completedAt, ts),
        ),
      );

    await writeAdminLog(admin.telegramId, "reset_tasks", telegramId);
    res.json({ success: true });
  },
);

// POST /admin/users/:telegramId/reset/quests
router.post(
  "/admin/users/:telegramId/reset/quests",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { telegramId } = req.params as { telegramId: string };
    const today = new Date().toISOString().split("T")[0] as string;

    await db
      .delete(questProgressTable)
      .where(
        and(
          eq(questProgressTable.telegramId, telegramId),
          eq(questProgressTable.date, today),
        ),
      );

    await writeAdminLog(admin.telegramId, "reset_quests", telegramId);
    res.json({ success: true });
  },
);

// ─── Task Management ─────────────────────────────────────────────────────────

// GET /admin/tasks — all tasks (all statuses)
router.get(
  "/admin/tasks",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [tasks, pendingCounts] = await Promise.all([
      db.select().from(tasksTable).orderBy(desc(tasksTable.id)),
      db
        .select({
          taskId: taskCompletionsTable.taskId,
          pending: count(),
        })
        .from(taskCompletionsTable)
        .where(eq(taskCompletionsTable.status, "pending"))
        .groupBy(taskCompletionsTable.taskId),
    ]);

    const pendingMap = new Map(pendingCounts.map((p) => [p.taskId, p.pending]));

    res.json({
      tasks: tasks.map((t) => ({
        ...t,
        pendingSubmissions: pendingMap.get(t.id) ?? 0,
      })),
    });
  },
);

// POST /admin/tasks — create
router.post(
  "/admin/tasks",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { title, description, reward, link, status, taskType } = req.body as {
      title: string;
      description: string;
      reward: number;
      link?: string;
      status?: string;
      taskType?: string;
    };

    if (!title?.trim() || !description?.trim()) {
      res.status(400).json({ error: "title and description required" });
      return;
    }

    const [task] = await db
      .insert(tasksTable)
      .values({
        title: title.trim(),
        description: description.trim(),
        reward: reward ?? 50,
        link: link ?? null,
        status: status ?? "active",
        taskType: taskType ?? "manual",
      })
      .returning();

    await writeAdminLog(admin.telegramId, "create_task", undefined, `taskId=${task!.id}`);
    res.status(201).json(task);
  },
);

// PUT /admin/tasks/:id — edit
router.put(
  "/admin/tasks/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const taskId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const { title, description, reward, link, status, taskType } = req.body as Partial<{
      title: string;
      description: string;
      reward: number;
      link: string;
      status: string;
      taskType: string;
    }>;

    const [task] = await db
      .update(tasksTable)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(reward !== undefined && { reward }),
        ...(link !== undefined && { link }),
        ...(status !== undefined && { status }),
        ...(taskType !== undefined && { taskType }),
      })
      .where(eq(tasksTable.id, taskId))
      .returning();

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    await writeAdminLog(admin.telegramId, "edit_task", undefined, `taskId=${taskId}`);
    res.json(task);
  },
);

// DELETE /admin/tasks/:id
router.delete(
  "/admin/tasks/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const taskId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
    await writeAdminLog(admin.telegramId, "delete_task", undefined, `taskId=${taskId}`);
    res.json({ success: true });
  },
);

// GET /admin/tasks/:id/submissions
router.get(
  "/admin/tasks/:id/submissions",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const taskId = parseInt(req.params["id"] as string, 10);
    const { status = "pending", limit: l = "50", offset: o = "0" } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(l, 10) || 50, 200);
    const offset = parseInt(o, 10) || 0;

    const submissions = await db
      .select({
        id: taskCompletionsTable.id,
        taskId: taskCompletionsTable.taskId,
        telegramId: taskCompletionsTable.telegramId,
        status: taskCompletionsTable.status,
        completedAt: taskCompletionsTable.completedAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(taskCompletionsTable)
      .leftJoin(usersTable, eq(taskCompletionsTable.telegramId, usersTable.telegramId))
      .where(
        and(
          eq(taskCompletionsTable.taskId, taskId),
          eq(taskCompletionsTable.status, status),
        ),
      )
      .orderBy(desc(taskCompletionsTable.completedAt))
      .limit(limit)
      .offset(offset);

    res.json({ submissions });
  },
);

// POST /admin/tasks/:id/submissions/:completionId/approve
router.post(
  "/admin/tasks/:id/submissions/:completionId/approve",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const completionId = parseInt(req.params["completionId"] as string, 10);

    const [completion] = await db
      .select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.id, completionId))
      .limit(1);

    if (!completion) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    await db
      .update(taskCompletionsTable)
      .set({ status: "approved", approved: 1 })
      .where(eq(taskCompletionsTable.id, completionId));

    await Promise.all([
      notifyUser(
        completion.telegramId,
        "Task Approved ✅",
        "Your task submission has been approved! You can now claim your reward.",
        "task",
      ),
      writeAdminLog(
        admin.telegramId,
        "approve_task",
        completion.telegramId,
        `completionId=${completionId}`,
      ),
    ]);

    res.json({ success: true });
  },
);

// POST /admin/tasks/:id/submissions/:completionId/reject
router.post(
  "/admin/tasks/:id/submissions/:completionId/reject",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const completionId = parseInt(req.params["completionId"] as string, 10);
    const { reason } = req.body as { reason?: string };

    const [completion] = await db
      .select()
      .from(taskCompletionsTable)
      .where(eq(taskCompletionsTable.id, completionId))
      .limit(1);

    if (!completion) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    await db
      .update(taskCompletionsTable)
      .set({ status: "rejected", approved: 0 })
      .where(eq(taskCompletionsTable.id, completionId));

    const msg = reason
      ? `Your task submission was rejected. Reason: ${reason}`
      : "Your task submission was rejected. You may try again.";

    await Promise.all([
      notifyUser(completion.telegramId, "Task Rejected ❌", msg, "task"),
      writeAdminLog(
        admin.telegramId,
        "reject_task",
        completion.telegramId,
        `completionId=${completionId} reason=${reason ?? "none"}`,
      ),
    ]);

    res.json({ success: true });
  },
);

// POST /admin/tasks/:id/submissions/bulk — bulk approve or reject
router.post(
  "/admin/tasks/:id/submissions/bulk",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { ids, action } = req.body as { ids: number[]; action: "approve" | "reject" };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array required" });
      return;
    }
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "action must be approve or reject" });
      return;
    }

    const completions = await db
      .select()
      .from(taskCompletionsTable)
      .where(inArray(taskCompletionsTable.id, ids));

    const newStatus = action === "approve" ? "approved" : "rejected";
    const newApproved = action === "approve" ? 1 : 0;

    await db
      .update(taskCompletionsTable)
      .set({ status: newStatus, approved: newApproved })
      .where(inArray(taskCompletionsTable.id, ids));

    const notifTitle =
      action === "approve" ? "Task Approved ✅" : "Task Rejected ❌";
    const notifMsg =
      action === "approve"
        ? "Your task submission has been approved! You can now claim your reward."
        : "Your task submission was rejected. You may try again.";

    await Promise.all([
      ...completions.map((c) =>
        notifyUser(c.telegramId, notifTitle, notifMsg, "task"),
      ),
      writeAdminLog(
        admin.telegramId,
        `bulk_${action}_tasks`,
        undefined,
        `ids=${ids.join(",")}`
      ),
    ]);

    res.json({ success: true, affected: completions.length });
  },
);

// ─── Quest Management ────────────────────────────────────────────────────────

// GET /admin/quests
router.get(
  "/admin/quests",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [quests, completionCounts] = await Promise.all([
      db.select().from(questsTable).orderBy(asc(questsTable.id)),
      db
        .select({ questId: questProgressTable.questId, completed: count() })
        .from(questProgressTable)
        .where(eq(questProgressTable.completed, 1))
        .groupBy(questProgressTable.questId),
    ]);

    const compMap = new Map(completionCounts.map((c) => [c.questId, c.completed]));

    res.json({
      quests: quests.map((q) => ({
        ...q,
        totalCompletions: compMap.get(q.id) ?? 0,
      })),
    });
  },
);

// POST /admin/quests
router.post(
  "/admin/quests",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { title, description, reward, questType, target } = req.body as {
      title: string;
      description: string;
      reward: number;
      questType: string;
      target: number;
    };

    if (!title?.trim() || !description?.trim() || !questType?.trim()) {
      res.status(400).json({ error: "title, description and questType required" });
      return;
    }

    const [quest] = await db
      .insert(questsTable)
      .values({
        title: title.trim(),
        description: description.trim(),
        reward: reward ?? 10,
        questType,
        target: target ?? 1,
      })
      .returning();

    await writeAdminLog(admin.telegramId, "create_quest", undefined, `questId=${quest!.id}`);
    res.status(201).json(quest);
  },
);

// PUT /admin/quests/:id
router.put(
  "/admin/quests/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    const { title, description, reward, questType, target } = req.body as Partial<{
      title: string;
      description: string;
      reward: number;
      questType: string;
      target: number;
    }>;

    const [quest] = await db
      .update(questsTable)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(reward !== undefined && { reward }),
        ...(questType !== undefined && { questType }),
        ...(target !== undefined && { target }),
      })
      .where(eq(questsTable.id, questId))
      .returning();

    if (!quest) {
      res.status(404).json({ error: "Quest not found" });
      return;
    }

    await writeAdminLog(admin.telegramId, "edit_quest", undefined, `questId=${questId}`);
    res.json(quest);
  },
);

// DELETE /admin/quests/:id
router.delete(
  "/admin/quests/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const questId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(questId)) {
      res.status(400).json({ error: "Invalid quest id" });
      return;
    }

    await db.delete(questsTable).where(eq(questsTable.id, questId));
    await writeAdminLog(admin.telegramId, "delete_quest", undefined, `questId=${questId}`);
    res.json({ success: true });
  },
);

// ─── Achievement Management ──────────────────────────────────────────────────

// GET /admin/achievements
router.get(
  "/admin/achievements",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [achievements, unlockCounts] = await Promise.all([
      db.select().from(achievementsTable).orderBy(asc(achievementsTable.id)),
      db
        .select({ achievementId: achievementUnlocksTable.achievementId, total: count() })
        .from(achievementUnlocksTable)
        .groupBy(achievementUnlocksTable.achievementId),
    ]);

    const countMap = new Map(unlockCounts.map((u) => [u.achievementId, u.total]));
    res.json({
      achievements: achievements.map((a) => ({
        ...a,
        totalUnlocks: countMap.get(a.id) ?? 0,
      })),
    });
  },
);

// POST /admin/achievements — create
router.post(
  "/admin/achievements",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { title, description, icon } = req.body as {
      title: string;
      description: string;
      icon: string;
    };

    if (!title?.trim() || !description?.trim() || !icon?.trim()) {
      res.status(400).json({ error: "title, description and icon required" });
      return;
    }

    const [achievement] = await db
      .insert(achievementsTable)
      .values({ title: title.trim(), description: description.trim(), icon: icon.trim() })
      .returning();

    await writeAdminLog(admin.telegramId, "create_achievement", undefined, `achievementId=${achievement!.id}`);
    res.status(201).json(achievement);
  },
);

// PUT /admin/achievements/:id
router.put(
  "/admin/achievements/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const achievementId = parseInt(req.params["id"] as string, 10);
    if (Number.isNaN(achievementId)) {
      res.status(400).json({ error: "Invalid achievement id" });
      return;
    }

    const { title, description, icon } = req.body as Partial<{
      title: string;
      description: string;
      icon: string;
    }>;

    const [achievement] = await db
      .update(achievementsTable)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
      })
      .where(eq(achievementsTable.id, achievementId))
      .returning();

    if (!achievement) {
      res.status(404).json({ error: "Achievement not found" });
      return;
    }

    await writeAdminLog(admin.telegramId, "edit_achievement", undefined, `achievementId=${achievementId}`);
    res.json(achievement);
  },
);

// GET /admin/achievements/:id/unlocks
router.get(
  "/admin/achievements/:id/unlocks",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const achievementId = parseInt(req.params["id"] as string, 10);

    const unlocks = await db
      .select({
        id: achievementUnlocksTable.id,
        telegramId: achievementUnlocksTable.telegramId,
        unlockedAt: achievementUnlocksTable.unlockedAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(achievementUnlocksTable)
      .leftJoin(usersTable, eq(achievementUnlocksTable.telegramId, usersTable.telegramId))
      .where(eq(achievementUnlocksTable.achievementId, achievementId))
      .orderBy(desc(achievementUnlocksTable.unlockedAt))
      .limit(100);

    res.json({ unlocks });
  },
);

// POST /admin/achievements/:id/unlock — force unlock for a user
router.post(
  "/admin/achievements/:id/unlock",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const achievementId = parseInt(req.params["id"] as string, 10);
    const { telegramId } = req.body as { telegramId: string };

    if (!telegramId) {
      res.status(400).json({ error: "telegramId required" });
      return;
    }

    const [existing] = await db
      .select()
      .from(achievementUnlocksTable)
      .where(
        and(
          eq(achievementUnlocksTable.achievementId, achievementId),
          eq(achievementUnlocksTable.telegramId, telegramId),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Achievement already unlocked for this user" });
      return;
    }

    await db.insert(achievementUnlocksTable).values({ achievementId, telegramId });
    await writeAdminLog(
      admin.telegramId,
      "force_unlock_achievement",
      telegramId,
      `achievementId=${achievementId}`,
    );
    res.json({ success: true });
  },
);

// DELETE /admin/achievements/:id/unlock/:telegramId
router.delete(
  "/admin/achievements/:id/unlock/:telegramId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const achievementId = parseInt(req.params["id"] as string, 10);
    const { telegramId } = req.params as { telegramId: string };

    await db
      .delete(achievementUnlocksTable)
      .where(
        and(
          eq(achievementUnlocksTable.achievementId, achievementId),
          eq(achievementUnlocksTable.telegramId, telegramId),
        ),
      );

    await writeAdminLog(
      admin.telegramId,
      "remove_achievement_unlock",
      telegramId,
      `achievementId=${achievementId}`,
    );
    res.json({ success: true });
  },
);

// ─── Broadcast Notifications ─────────────────────────────────────────────────

// POST /admin/notifications/broadcast
router.post(
  "/admin/notifications/broadcast",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { title, message, target } = req.body as {
      title: string;
      message: string;
      target: "everyone" | "active_today" | "top_miners" | "top_referrers" | "specific";
      telegramId?: string;
    };

    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: "title and message required" });
      return;
    }

    let recipients: string[] = [];
    const ts = todayStart();

    switch (target) {
      case "everyone": {
        const users = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(eq(usersTable.isBanned, false));
        recipients = users.map((u) => u.telegramId);
        break;
      }
      case "active_today": {
        const users = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(
            and(eq(usersTable.isBanned, false), gte(usersTable.lastActive, ts)),
          );
        recipients = users.map((u) => u.telegramId);
        break;
      }
      case "top_miners": {
        const users = await db
          .select({ telegramId: usersTable.telegramId })
          .from(usersTable)
          .where(eq(usersTable.isBanned, false))
          .orderBy(desc(usersTable.totalMines))
          .limit(100);
        recipients = users.map((u) => u.telegramId);
        break;
      }
      case "top_referrers": {
        const agg = await db
          .select({
            referrerTelegramId: referralsTable.referrerTelegramId,
            cnt: count(),
          })
          .from(referralsTable)
          .groupBy(referralsTable.referrerTelegramId)
          .orderBy(desc(sql`count(*)`))
          .limit(100);
        recipients = agg.map((r) => r.referrerTelegramId);
        break;
      }
      case "specific": {
        const { telegramId: tid } = req.body as { telegramId?: string };
        if (!tid) {
          res.status(400).json({ error: "telegramId required for specific target" });
          return;
        }
        recipients = [tid];
        break;
      }
      default:
        res.status(400).json({ error: "Invalid target" });
        return;
    }

    if (recipients.length === 0) {
      res.json({ success: true, sent: 0 });
      return;
    }

    // Batch insert notifications
    const BATCH = 500;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await db.insert(notificationsTable).values(
        batch.map((tid) => ({
          telegramId: tid,
          title: title.trim(),
          message: message.trim(),
          type: "system" as const,
          read: false,
        })),
      );
    }

    await writeAdminLog(
      admin.telegramId,
      "broadcast_notification",
      undefined,
      `target=${target} count=${recipients.length}`,
    );

    res.json({ success: true, sent: recipients.length });
  },
);

// ─── Announcements ───────────────────────────────────────────────────────────

// GET /admin/announcements
router.get(
  "/admin/announcements",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const items = await db
      .select()
      .from(announcementsTable)
      .orderBy(desc(announcementsTable.createdAt));
    res.json({ announcements: items });
  },
);

// POST /admin/announcements
router.post(
  "/admin/announcements",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const { message, type, isPinned, pinnedUntil, scheduledFor } = req.body as {
      message: string;
      type?: string;
      isPinned?: boolean;
      pinnedUntil?: string;
      scheduledFor?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message required" });
      return;
    }

    const [announcement] = await db
      .insert(announcementsTable)
      .values({
        adminTelegramId: admin.telegramId,
        message: message.trim(),
        type: type ?? "broadcast",
        isPinned: isPinned ?? false,
        pinnedUntil: pinnedUntil ? new Date(pinnedUntil) : null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        sentAt: !scheduledFor ? new Date() : null,
      })
      .returning();

    await writeAdminLog(admin.telegramId, "create_announcement", undefined, `announcementId=${announcement!.id}`);
    res.status(201).json(announcement);
  },
);

// PUT /admin/announcements/:id
router.put(
  "/admin/announcements/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const announcementId = parseInt(req.params["id"] as string, 10);

    const { message, type, isPinned, pinnedUntil } = req.body as Partial<{
      message: string;
      type: string;
      isPinned: boolean;
      pinnedUntil: string;
    }>;

    const [item] = await db
      .update(announcementsTable)
      .set({
        ...(message !== undefined && { message }),
        ...(type !== undefined && { type }),
        ...(isPinned !== undefined && { isPinned }),
        ...(pinnedUntil !== undefined && { pinnedUntil: new Date(pinnedUntil) }),
      })
      .where(eq(announcementsTable.id, announcementId))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Announcement not found" });
      return;
    }

    await writeAdminLog(admin.telegramId, "edit_announcement", undefined, `announcementId=${announcementId}`);
    res.json(item);
  },
);

// DELETE /admin/announcements/:id
router.delete(
  "/admin/announcements/:id",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const announcementId = parseInt(req.params["id"] as string, 10);

    await db.delete(announcementsTable).where(eq(announcementsTable.id, announcementId));
    await writeAdminLog(admin.telegramId, "delete_announcement", undefined, `announcementId=${announcementId}`);
    res.json({ success: true });
  },
);

// POST /admin/announcements/:id/pin
router.post(
  "/admin/announcements/:id/pin",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const announcementId = parseInt(req.params["id"] as string, 10);

    await db
      .update(announcementsTable)
      .set({ isPinned: true })
      .where(eq(announcementsTable.id, announcementId));

    await writeAdminLog(admin.telegramId, "pin_announcement", undefined, `announcementId=${announcementId}`);
    res.json({ success: true });
  },
);

// POST /admin/announcements/:id/unpin
router.post(
  "/admin/announcements/:id/unpin",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const announcementId = parseInt(req.params["id"] as string, 10);

    await db
      .update(announcementsTable)
      .set({ isPinned: false })
      .where(eq(announcementsTable.id, announcementId));

    await writeAdminLog(admin.telegramId, "unpin_announcement", undefined, `announcementId=${announcementId}`);
    res.json({ success: true });
  },
);

// ─── Transactions ────────────────────────────────────────────────────────────

// GET /admin/transactions
router.get(
  "/admin/transactions",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      search = "",
      type = "",
      dateFrom = "",
      dateTo = "",
      limit: l = "50",
      offset: o = "0",
    } = req.query as Record<string, string>;

    const limit = Math.min(parseInt(l, 10) || 50, 200);
    const offset = parseInt(o, 10) || 0;

    const conditions: ReturnType<typeof eq>[] = [];

    if (search.trim()) {
      conditions.push(
        ilike(transactionsTable.telegramId, `%${search.trim()}%`) as ReturnType<typeof eq>,
      );
    }
    if (type.trim()) {
      conditions.push(eq(transactionsTable.type, type.trim()) as ReturnType<typeof eq>);
    }
    if (dateFrom) {
      conditions.push(gte(transactionsTable.createdAt, new Date(dateFrom)) as ReturnType<typeof eq>);
    }
    if (dateTo) {
      conditions.push(lte(transactionsTable.createdAt, new Date(dateTo)) as ReturnType<typeof eq>);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

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

    res.json({ transactions, total, limit, offset });
  },
);

// ─── Global HP Grant ─────────────────────────────────────────────────────────

// Helper — parse batchId from admin log details string
function parseBatchId(details: string | null | undefined): string | null {
  return details?.match(/batchId=(\S+)/)?.[1] ?? null;
}

// GET /admin/grant-everyone/preview — returns user count + HP impact estimate
router.get(
  "/admin/grant-everyone/preview",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { amount: amountStr } = req.query as { amount?: string };
    const parsedAmount = Number(amountStr);

    if (!amountStr || !Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 5000) {
      res.status(400).json({ error: "amount must be an integer between 1 and 5000" });
      return;
    }

    const [[{ userCount }], [{ currentCirculatingHP }]] = await Promise.all([
      db.select({ userCount: count() }).from(usersTable).where(eq(usersTable.isBanned, false)),
      db.select({ currentCirculatingHP: sql<number>`coalesce(sum(balance), 0)` }).from(usersTable),
    ]);

    const totalHP = userCount * parsedAmount;
    res.json({
      userCount,
      totalHP,
      currentCirculatingHP: Number(currentCirculatingHP),
      estimatedNewCirculatingHP: Number(currentCirculatingHP) + totalHP,
    });
  },
);

// GET /admin/grant-everyone/last — last grant info + rollback eligibility
// Used by the Dashboard to show the rollback panel across page reloads and devices.
router.get(
  "/admin/grant-everyone/last",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const [lastGrant] = await db
      .select()
      .from(adminLogsTable)
      .where(eq(adminLogsTable.action, "grant_everyone"))
      .orderBy(desc(adminLogsTable.createdAt), desc(adminLogsTable.id))
      .limit(1);

    if (!lastGrant) {
      res.json({ lastGrant: null, canRollback: false });
      return;
    }

    const batchId = parseBatchId(lastGrant.details);
    let canRollback = false;

    if (batchId) {
      const rollbackLogs = await db
        .select({ details: adminLogsTable.details })
        .from(adminLogsTable)
        .where(eq(adminLogsTable.action, "rollback_grant_everyone"));

      canRollback = !rollbackLogs.some((l) => l.details?.includes(`batchId=${batchId}`));
    }

    res.json({
      lastGrant: {
        id: lastGrant.id,
        batchId,
        details: lastGrant.details,
        createdAt: lastGrant.createdAt,
        adminTelegramId: lastGrant.adminTelegramId,
      },
      canRollback,
    });
  },
);

// POST /admin/grant-everyone
router.post(
  "/admin/grant-everyone",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.ip ??
      "unknown";
    const { amount, reason, notify } = req.body as {
      amount: unknown;
      reason: unknown;
      notify: unknown;
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 5000) {
      res.status(400).json({ error: "amount must be an integer between 1 and 5,000" });
      return;
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({ error: "reason is required" });
      return;
    }
    const shouldNotify = notify === true || notify === "true";
    const trimmedReason = reason.trim();

    // ── Best-effort duplicate guard (same amount+reason within 10 min) ────────
    // This is a pre-flight check; the audit log is written inside the transaction
    // so a committed grant is always reflected in subsequent checks.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentGrants = await db
      .select({ details: adminLogsTable.details })
      .from(adminLogsTable)
      .where(and(eq(adminLogsTable.action, "grant_everyone"), gte(adminLogsTable.createdAt, tenMinutesAgo)));

    const isDuplicate = recentGrants.some(({ details }) => {
      const d = details ?? "";
      return d.includes(`amount=${parsedAmount}`) && d.includes(`reason=${trimmedReason}`);
    });

    if (isDuplicate) {
      res.status(409).json({
        error:
          "A grant with the same amount and reason was already sent within the last 10 minutes. Please wait before sending again.",
      });
      return;
    }

    // ── Generate batch ID for rollback tracking ───────────────────────────────
    const batchId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      // ── Single atomic transaction: balance updates + audit log ────────────
      // Writing the audit log inside the transaction ensures the grant and its
      // audit record are either both committed or both rolled back.
      const { grantedUsers, grantCount, totalHPDistributed } = await db.transaction(async (tx) => {
        const users = await tx
          .select({ telegramId: usersTable.telegramId, balance: usersTable.balance })
          .from(usersTable)
          .where(eq(usersTable.isBanned, false))
          .for("update");

        if (users.length === 0) return { grantedUsers: [], grantCount: 0, totalHPDistributed: 0 };

        // Update ONLY the exact locked set (not WHERE isBanned=false) so no
        // row created or unbanned after the SELECT..FOR UPDATE can receive HP
        // without a corresponding transaction record.
        const lockedIds = users.map((u) => u.telegramId);
        const BATCH = 500;
        for (let i = 0; i < lockedIds.length; i += BATCH) {
          await tx
            .update(usersTable)
            .set({ balance: sql`${usersTable.balance} + ${parsedAmount}` })
            .where(inArray(usersTable.telegramId, lockedIds.slice(i, i + BATCH)));
        }

        for (let i = 0; i < users.length; i += BATCH) {
          const chunk = users.slice(i, i + BATCH);
          await tx.insert(transactionsTable).values(
            chunk.map((u) => ({
              telegramId: u.telegramId,
              type: "admin_grant",
              amount: parsedAmount,
              balanceBefore: u.balance,
              balanceAfter: u.balance + parsedAmount,
              description: trimmedReason,
              relatedId: `grant_${batchId}`,
            })),
          );
        }

        // Audit log inside the transaction — atomic with balance updates
        await tx.insert(adminLogsTable).values({
          adminTelegramId: admin.telegramId,
          action: "grant_everyone",
          details: `amount=${parsedAmount} reason=${trimmedReason} users=${users.length} totalHP=${parsedAmount * users.length} notify=${shouldNotify} batchId=${batchId} adminName=${admin.firstName} ip=${ip}`,
        });

        return { grantedUsers: users, grantCount: users.length, totalHPDistributed: parsedAmount * users.length };
      });

      if (grantCount === 0) {
        res.json({ success: true, count: 0, batchId, message: "No eligible users to grant." });
        return;
      }

      void totalHPDistributed; // used inside transaction only; keep for future logging

      // ── Notifications — best-effort, isolated from operation success ───────
      let notifsSent = 0;
      if (shouldNotify) {
        try {
          const BATCH = 500;
          for (let i = 0; i < grantedUsers.length; i += BATCH) {
            const chunk = grantedUsers.slice(i, i + BATCH);
            await db.insert(notificationsTable).values(
              chunk.map((u) => ({
                telegramId: u.telegramId,
                title: `🎁 ${parsedAmount} HP Granted!`,
                message: `You received ${parsedAmount} HP! Reason: ${trimmedReason}`,
                type: "system" as const,
                read: false,
              })),
            );
            notifsSent += chunk.length;
          }
        } catch (notifErr) {
          req.log.error(
            { err: notifErr },
            "Grant notifications failed — grant and audit log were committed successfully",
          );
        }
      }

      res.json({
        success: true,
        count: grantCount,
        batchId,
        message: `Successfully granted ${parsedAmount} HP to ${grantCount} users.`,
        ...(shouldNotify ? { notificationsSent: notifsSent } : {}),
      });
    } catch (err) {
      req.log.error({ err }, "Global HP grant failed");
      res.status(500).json({ error: "Global HP grant failed" });
    }
  },
);

// POST /admin/grant-everyone/rollback — reverse the last grant (once only, race-safe)
router.post(
  "/admin/grant-everyone/rollback",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.ip ??
      "unknown";

    // Find the most recent grant — order by (createdAt DESC, id DESC) for
    // deterministic selection when two rows share the same timestamp.
    const [lastGrant] = await db
      .select()
      .from(adminLogsTable)
      .where(eq(adminLogsTable.action, "grant_everyone"))
      .orderBy(desc(adminLogsTable.createdAt), desc(adminLogsTable.id))
      .limit(1);

    if (!lastGrant) {
      res.status(404).json({ error: "No grant found to rollback" });
      return;
    }

    const batchId = parseBatchId(lastGrant.details);
    if (!batchId) {
      res.status(400).json({
        error: "Last grant has no batchId — it predates rollback support and cannot be auto-reversed",
      });
      return;
    }

    // Find batch transactions (needed before the locking transaction)
    const batchTransactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.relatedId, `grant_${batchId}`));

    if (batchTransactions.length === 0) {
      res.status(404).json({ error: "No transactions found for this grant batch" });
      return;
    }

    const grantAmount = batchTransactions[0]!.amount;

    try {
      // ── Race-safe rollback transaction ────────────────────────────────────
      // pg_advisory_xact_lock serialises concurrent rollback calls for the same
      // batchId. The second caller blocks until the first transaction commits,
      // then finds the rollback log already present and aborts cleanly.
      await db.transaction(async (tx) => {
        // Acquire exclusive advisory lock keyed on this batchId
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${"rollback_grant_" + batchId}))`,
        );

        // Re-check for existing rollback inside the lock
        const existingRollbacks = await tx
          .select({ details: adminLogsTable.details })
          .from(adminLogsTable)
          .where(eq(adminLogsTable.action, "rollback_grant_everyone"));

        if (existingRollbacks.some((l) => l.details?.includes(`batchId=${batchId}`))) {
          throw Object.assign(new Error("ALREADY_ROLLED_BACK"), { code: "ALREADY_ROLLED_BACK" });
        }

        // Re-verify this batch is still the latest grant — guards against a new
        // grant being committed between the initial lookup and this transaction.
        // Use (createdAt DESC, id DESC) for deterministic tie-breaking.
        const [currentLatest] = await tx
          .select({ id: adminLogsTable.id })
          .from(adminLogsTable)
          .where(eq(adminLogsTable.action, "grant_everyone"))
          .orderBy(desc(adminLogsTable.createdAt), desc(adminLogsTable.id))
          .limit(1);

        if (!currentLatest || currentLatest.id !== lastGrant.id) {
          throw Object.assign(new Error("GRANT_SUPERSEDED"), { code: "GRANT_SUPERSEDED" });
        }

        // Write rollback audit log FIRST (atomic with balance changes)
        await tx.insert(adminLogsTable).values({
          adminTelegramId: admin.telegramId,
          action: "rollback_grant_everyone",
          details: `batchId=${batchId} reversed=${batchTransactions.length} amount=${grantAmount} ip=${ip}`,
        });

        // Deduct grant amount from current balances (floor at 0).
        // Rationale: this removes the granted HP from circulation regardless of
        // subsequent spending — the closest mathematically-sound reversal that
        // does not undo legitimate post-grant activity.
        const CHUNK = 500;
        for (let i = 0; i < batchTransactions.length; i += CHUNK) {
          const chunk = batchTransactions.slice(i, i + CHUNK);
          const chunkIds = chunk.map((t) => t.telegramId);

          const currentBalances = await tx
            .select({ telegramId: usersTable.telegramId, balance: usersTable.balance })
            .from(usersTable)
            .where(inArray(usersTable.telegramId, chunkIds))
            .for("update");

          const balanceMap = new Map(currentBalances.map((u) => [u.telegramId, u.balance]));

          await tx
            .update(usersTable)
            .set({ balance: sql`greatest(${usersTable.balance} - ${grantAmount}, 0)` })
            .where(inArray(usersTable.telegramId, chunkIds));

          await tx.insert(transactionsTable).values(
            chunkIds.map((telegramId) => {
              const before = balanceMap.get(telegramId) ?? 0;
              return {
                telegramId,
                type: "admin_deduct",
                amount: -grantAmount,
                balanceBefore: before,
                balanceAfter: Math.max(0, before - grantAmount),
                description: `Rollback of HP grant (batch ${batchId})`,
                relatedId: `rollback_${batchId}`,
              };
            }),
          );
        }
      });

      res.json({
        success: true,
        reversed: batchTransactions.length,
        message: `Successfully rolled back grant of ${grantAmount} HP from ${batchTransactions.length} users.`,
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ALREADY_ROLLED_BACK") {
        res.status(409).json({ error: "This grant has already been rolled back" });
        return;
      }
      if (code === "GRANT_SUPERSEDED") {
        res.status(409).json({
          error:
            "A newer grant has been issued since you opened this page. Refresh to see the latest grant before rolling back.",
        });
        return;
      }
      req.log.error({ err }, "Grant rollback failed");
      res.status(500).json({ error: "Rollback failed" });
    }
  },
);

// ─── Admin Logs ───────────────────────────────────────────────────────────────

// GET /admin/logs
router.get(
  "/admin/logs",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { limit: l = "50", offset: o = "0" } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(l, 10) || 50, 200);
    const offset = parseInt(o, 10) || 0;

    const [logs, [{ total }]] = await Promise.all([
      db
        .select()
        .from(adminLogsTable)
        .orderBy(desc(adminLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(adminLogsTable),
    ]);

    res.json({ logs, total, limit, offset });
  },
);

// ─── System Settings (Super Admin only) ───────────────────────────────────────

function requireSuperAdmin(req: Request, res: Response, next: () => void): void {
  const admin = (req as AdminRequest).currentUser;
  if (admin.telegramId !== SUPER_ADMIN_TELEGRAM_ID) {
    res.status(403).json({ error: "Super Admin access required" });
    return;
  }
  next();
}

// GET /admin/settings — read all configurable settings
router.get(
  "/admin/settings",
  requireAdmin,
  (req: Request, res: Response, next: () => void) => requireSuperAdmin(req, res, next),
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.select().from(systemSettingsTable);
    // Merge in defaults for any key that isn't in the table yet
    const settings: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  },
);

// PUT /admin/settings — update one or more settings (Super Admin only)
router.put(
  "/admin/settings",
  requireAdmin,
  (req: Request, res: Response, next: () => void) => requireSuperAdmin(req, res, next),
  async (req: Request, res: Response): Promise<void> => {
    const admin = (req as AdminRequest).currentUser;
    const incoming = req.body as Record<string, unknown>;

    const ALLOWED_KEYS = new Set<string>(Object.values(SETTING_KEYS));
    const updates: { key: string; oldValue: string; newValue: string }[] = [];

    // Read existing values first so we can log old→new
    const existing = await db.select().from(systemSettingsTable);
    const existingMap = new Map(existing.map((r) => [r.key, r.value]));

    for (const [key, rawValue] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.has(key)) continue;

      let newValue: string;

      if (key === SETTING_KEYS.WELCOME_BONUS_ENABLED) {
        // Must be "true" or "false"
        if (rawValue !== true && rawValue !== false && rawValue !== "true" && rawValue !== "false") {
          res.status(400).json({ error: `${key} must be a boolean` });
          return;
        }
        newValue = String(rawValue === true || rawValue === "true");
      } else {
        // Amount fields: must be a positive integer
        const n = parseInt(String(rawValue), 10);
        if (isNaN(n) || n < 0) {
          res.status(400).json({ error: `${key} must be a non-negative integer` });
          return;
        }
        newValue = String(n);
      }

      const oldValue = existingMap.get(key) ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
      updates.push({ key, oldValue, newValue });
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No valid settings provided" });
      return;
    }

    // Apply updates
    for (const { key, newValue } of updates) {
      await db
        .insert(systemSettingsTable)
        .values({ key, value: newValue, updatedByTelegramId: admin.telegramId })
        .onConflictDoUpdate({
          target: systemSettingsTable.key,
          set: {
            value: newValue,
            updatedAt: new Date(),
            updatedByTelegramId: admin.telegramId,
          },
        });
    }

    // Write audit log entries with old/new values
    for (const { key, oldValue, newValue } of updates) {
      await writeAdminLog(
        admin.telegramId,
        `update_setting:${key}`,
        undefined,
        JSON.stringify({
          key,
          adminId: admin.id,
          telegramId: admin.telegramId,
          username: admin.username,
          oldValue,
          newValue,
        }),
      );
    }

    res.json({
      success: true,
      updated: updates.map(({ key, oldValue, newValue }) => ({ key, oldValue, newValue })),
    });
  },
);

export default router;
