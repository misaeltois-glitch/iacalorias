import { Router, type IRouter } from "express";
import { optionalAuth } from "../lib/auth-middleware.js";
import { analysisRateLimit, authRateLimit, generalRateLimit } from "../lib/rate-limit.js";
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
import recipeRouter from "./recipe";

const router: IRouter = Router();

router.use(optionalAuth);

router.use(healthRouter);
router.use("/auth", authRateLimit, authRouter);
router.use("/user", generalRateLimit, userRouter);
router.use("/analysis", analysisRateLimit, analysisRouter);
router.use("/subscription", generalRateLimit, subscriptionRouter);
router.use("/goals", generalRateLimit, goalsRouter);
router.use("/analytics", generalRateLimit, analyticsRouter);
router.use("/workout", generalRateLimit, workoutRouter);
router.use("/chat", analysisRateLimit, chatRouter);
router.use("/weight", generalRateLimit, weightRouter);
router.use("/weekly-report", generalRateLimit, weeklyReportRouter);
router.use("/meal-plan", analysisRateLimit, mealPlanRouter);
router.use("/referral", generalRateLimit, referralRouter);
router.use("/recipe", analysisRateLimit, recipeRouter);

export default router;
