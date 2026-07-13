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
import walletRouter from "./wallet";
import adminRouter from "./admin";
import adminPhase2Router from "./admin-phase2";
import publicRouter from "./public";

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
router.use(walletRouter);
router.use(adminRouter);
router.use(adminPhase2Router);
router.use(publicRouter);

export default router;
