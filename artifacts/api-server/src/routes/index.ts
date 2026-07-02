import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import miningRouter from "./mining";
import referralsRouter from "./referrals";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(miningRouter);
router.use(referralsRouter);
router.use(leaderboardRouter);

export default router;
