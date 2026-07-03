import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import miningRouter from "./mining";
import referralsRouter from "./referrals";
import leaderboardRouter from "./leaderboard";
import tasksRouter from "./tasks";
import questsRouter from "./quests";
import achievementsRouter from "./achievements";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(miningRouter);
router.use(referralsRouter);
router.use(leaderboardRouter);
router.use(tasksRouter);
router.use(questsRouter);
router.use(achievementsRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;
