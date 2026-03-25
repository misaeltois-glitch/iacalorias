import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import analysisRouter from "./analysis";
import subscriptionRouter from "./subscription";
import goalsRouter from "./goals";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/analysis", analysisRouter);
router.use("/subscription", subscriptionRouter);
router.use("/goals", goalsRouter);

export default router;
