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

export default router;
