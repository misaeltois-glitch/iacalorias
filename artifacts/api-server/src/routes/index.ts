import { Router, type IRouter } from "express";
import { optionalAuth } from "../lib/auth-middleware.js";
import healthRouter from "./health";
import userRouter from "./user";
import analysisRouter from "./analysis";
import subscriptionRouter from "./subscription";
import goalsRouter from "./goals";
import authRouter from "./auth";
import analyticsRouter from "./analytics";
import workoutRouter from "./workout";
import chatRouter from "./chat";
import weightRouter from "./weight";
import weeklyReportRouter from "./weekly-report";
import mealPlanRouter from "./meal-plan";
import referralRouter from "./referral";

const router: IRouter = Router();

router.use(optionalAuth);

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/analysis", analysisRouter);
router.use("/subscription", subscriptionRouter);
router.use("/goals", goalsRouter);
router.use("/analytics", analyticsRouter);
router.use("/workout", workoutRouter);
router.use("/chat", chatRouter);
router.use("/weight", weightRouter);
router.use("/weekly-report", weeklyReportRouter);
router.use("/meal-plan", mealPlanRouter);
router.use("/referral", referralRouter);

export default router;
