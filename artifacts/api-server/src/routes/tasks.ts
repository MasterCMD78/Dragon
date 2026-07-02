import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  tasksTable,
  taskCompletionsTable,
  transactionsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { classifyTask, DAY_MS, FEATURE_LAUNCH_AT, type TaskCategory, type TaskStatus } from "../lib/tasks";

const router: IRouter = Router();

type AuthedRequest = Request & { currentUser: typeof usersTable.$inferSelect };
type Task = typeof tasksTable.$inferSelect;
type TaskCompletion = typeof taskCompletionsTable.$inferSelect;

interface EffectiveState {
  status: TaskStatus;
  canClaim: boolean;
  lastCompletedAt: string | null;
  latest: TaskCompletion | null;
}

/** Compute the user-facing status of a task from its most recent completion row. */
async function getEffectiveState(
  taskId: number,
  telegramId: string,
  category: TaskCategory,
): Promise<EffectiveState> {
  const [latest] = await db
    .select()
    .from(taskCompletionsTable)
    .where(
      and(
        eq(taskCompletionsTable.taskId, taskId),
        eq(taskCompletionsTable.telegramId, telegramId),
      ),
    )
    .orderBy(desc(taskCompletionsTable.completedAt))
    .limit(1);

  if (!latest) {
    return { status: "available", canClaim: false, lastCompletedAt: null, latest: null };
  }

  const isDaily = category === "daily";
  const isStale = isDaily && Date.now() - latest.completedAt.getTime() >= DAY_MS;

  if (latest.status === "rejected" || (isStale && (latest.status === "completed" || latest.status === "approved"))) {
    return { status: "available", canClaim: false, lastCompletedAt: null, latest };
  }

  if (latest.status === "completed") {
    return {
      status: "completed",
      canClaim: false,
      lastCompletedAt: latest.completedAt.toISOString(),
      latest,
    };
  }

  if (latest.status === "approved") {
    const canClaim =
      latest.completedAt >= FEATURE_LAUNCH_AT && (await hasNoRewardTransaction(latest.id));
    return {
      status: canClaim ? "completed" : "completed",
      canClaim,
      lastCompletedAt: latest.completedAt.toISOString(),
      latest,
    };
  }

  if (latest.status === "pending") {
    return { status: "pending_approval", canClaim: false, lastCompletedAt: null, latest };
  }

  if (latest.status === "in_progress") {
    return { status: "in_progress", canClaim: false, lastCompletedAt: null, latest };
  }

  return { status: "available", canClaim: false, lastCompletedAt: null, latest };
}

async function hasNoRewardTransaction(completionId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "task"),
        eq(transactionsTable.relatedId, String(completionId)),
      ),
    )
    .limit(1);
  return !row;
}

function serializeTask(
  task: Task,
  category: TaskCategory,
  state: EffectiveState,
) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    reward: task.reward,
    link: task.link,
    taskType: task.taskType as "automatic" | "manual",
    category,
    status: state.status,
    canClaim: state.canClaim,
    lastCompletedAt: state.lastCompletedAt,
  };
}

// GET /tasks — list all active tasks with the current user's status on each
router.get(
  "/tasks",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.status, "active"))
      .orderBy(tasksTable.id);

    const results = await Promise.all(
      tasks.map(async (task) => {
        const { category } = classifyTask(task.title);
        const state = await getEffectiveState(task.id, user.telegramId, category);
        return serializeTask(task, category, state);
      }),
    );

    res.json({ tasks: results });
  },
);

// GET /tasks/:id — task details with the current user's status
router.get(
  "/tasks/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.status, "active")))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { category } = classifyTask(task.title);
    const state = await getEffectiveState(task.id, user.telegramId, category);
    res.json(serializeTask(task, category, state));
  },
);

// POST /tasks/:id/start — mark a task as in progress
router.post(
  "/tasks/:id/start",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthedRequest).currentUser;
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.status, "active")))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { category } = classifyTask(task.title);
    const state = await getEffectiveState(task.id, user.telegramId, category);

    if (state.status === "completed") {
      res.status(400).json({ error: "Task already completed" });
      return;
    }
    if (state.status === "pending_approval") {
      res.status(400).json({ error: "Task is pending approval" });
      return;
    }
    if (state.status === "in_progress") {
      res.json(serializeTask(task, category, state));
      return;
    }

    await db.insert(taskCompletionsTable).values({
      taskId: task.id,
      telegramId: user.telegramId,
      status: "in_progress",
      approved: 0,
    });

    const newState = await getEffectiveState(task.id, user.telegramId, category);
    res.json(serializeTask(task, category, newState));
  },
);

// POST /tasks/:id/complete — automatic tasks: verify + reward atomically.
// Manual tasks: submit for admin approval (no reward yet).
router.post(
  "/tasks/:id/complete",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const authedUser = (req as AuthedRequest).currentUser;
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.status, "active")))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const { category, verify } = classifyTask(task.title);
    const preState = await getEffectiveState(task.id, authedUser.telegramId, category);

    if (preState.status === "completed") {
      res.status(400).json({ error: "Task already completed" });
      return;
    }
    if (preState.status === "pending_approval") {
      res.status(400).json({ error: "Task is pending approval" });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        // Lock the user row for the duration of this transaction so concurrent
        // task actions for the same user serialize (prevents double-reward races).
        const [lockedUser] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, authedUser.id))
          .for("update");

        // Re-check status inside the lock in case of a concurrent request.
        const [latest] = await tx
          .select()
          .from(taskCompletionsTable)
          .where(
            and(
              eq(taskCompletionsTable.taskId, task.id),
              eq(taskCompletionsTable.telegramId, lockedUser.telegramId),
            ),
          )
          .orderBy(desc(taskCompletionsTable.completedAt))
          .limit(1);

        const isDaily = category === "daily";
        const isStale =
          isDaily && latest && Date.now() - latest.completedAt.getTime() >= DAY_MS;
        const alreadyDone =
          latest &&
          latest.status !== "rejected" &&
          !(isStale && (latest.status === "completed" || latest.status === "approved")) &&
          (latest.status === "completed" || latest.status === "pending");

        if (alreadyDone) {
          return { conflict: latest!.status as "completed" | "pending" };
        }

        if (task.taskType === "automatic") {
          const conditionMet = verify ? await verify(lockedUser) : true;
          if (!conditionMet) {
            return { conditionNotMet: true as const };
          }

          const [completion] = await tx
            .insert(taskCompletionsTable)
            .values({
              taskId: task.id,
              telegramId: lockedUser.telegramId,
              status: "completed",
              approved: 1,
            })
            .returning();

          const newBalance = lockedUser.balance + task.reward;
          await tx
            .update(usersTable)
            .set({ balance: newBalance })
            .where(eq(usersTable.id, lockedUser.id));

          await tx.insert(transactionsTable).values({
            telegramId: lockedUser.telegramId,
            type: "task",
            amount: task.reward,
            balanceBefore: lockedUser.balance,
            balanceAfter: newBalance,
            description: `Task reward: ${task.title}`,
            relatedId: String(completion.id),
          });

          return {
            status: "completed" as const,
            reward: task.reward,
            newBalance,
          };
        }

        // Manual task — submit for approval, no reward yet.
        await tx.insert(taskCompletionsTable).values({
          taskId: task.id,
          telegramId: lockedUser.telegramId,
          status: "pending",
          approved: 0,
        });

        return {
          status: "pending_approval" as const,
          reward: task.reward,
          newBalance: lockedUser.balance,
        };
      });

      if ("conflict" in result) {
        res.status(400).json({
          error:
            result.conflict === "completed"
              ? "Task already completed"
              : "Task is pending approval",
        });
        return;
      }
      if ("conditionNotMet" in result) {
        res.status(400).json({ error: "Task condition not met yet" });
        return;
      }

      req.log.info(
        { userId: authedUser.id, taskId: task.id, status: result.status },
        "Task completion processed",
      );

      res.json(result);
    } catch (err) {
      req.log.error({ err, taskId: task.id }, "Failed to complete task");
      res.status(500).json({ error: "Failed to complete task" });
    }
  },
);

// POST /tasks/:id/claim — claim a reward for a manual task approved by an admin
router.post(
  "/tasks/:id/claim",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const authedUser = (req as AuthedRequest).currentUser;
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.status, "active")))
      .limit(1);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    try {
      const result = await db.transaction(async (tx) => {
        const [lockedUser] = await tx
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, authedUser.id))
          .for("update");

        const [latest] = await tx
          .select()
          .from(taskCompletionsTable)
          .where(
            and(
              eq(taskCompletionsTable.taskId, task.id),
              eq(taskCompletionsTable.telegramId, lockedUser.telegramId),
            ),
          )
          .orderBy(desc(taskCompletionsTable.completedAt))
          .limit(1);

        if (!latest || latest.status !== "approved") {
          return { notClaimable: true as const, reason: "Not approved yet" };
        }
        if (latest.completedAt < FEATURE_LAUNCH_AT) {
          return { notClaimable: true as const, reason: "Already settled" };
        }

        const alreadyPaid = !(await hasNoRewardTransaction(latest.id));
        if (alreadyPaid) {
          return { notClaimable: true as const, reason: "Already claimed" };
        }

        await tx
          .update(taskCompletionsTable)
          .set({ status: "completed" })
          .where(eq(taskCompletionsTable.id, latest.id));

        const newBalance = lockedUser.balance + task.reward;
        await tx
          .update(usersTable)
          .set({ balance: newBalance })
          .where(eq(usersTable.id, lockedUser.id));

        await tx.insert(transactionsTable).values({
          telegramId: lockedUser.telegramId,
          type: "task",
          amount: task.reward,
          balanceBefore: lockedUser.balance,
          balanceAfter: newBalance,
          description: `Task reward claimed: ${task.title}`,
          relatedId: String(latest.id),
        });

        return { status: "completed" as const, reward: task.reward, newBalance };
      });

      if ("notClaimable" in result) {
        res.status(400).json({ error: result.reason });
        return;
      }

      req.log.info({ userId: authedUser.id, taskId: task.id }, "Task reward claimed");
      res.json(result);
    } catch (err) {
      req.log.error({ err, taskId: task.id }, "Failed to claim task reward");
      res.status(500).json({ error: "Failed to claim task reward" });
    }
  },
);

export default router;
