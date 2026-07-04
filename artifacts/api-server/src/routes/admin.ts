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

export default router;
