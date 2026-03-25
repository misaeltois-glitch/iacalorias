import { Router, type IRouter } from "express";
import healthRouter from "./health";
import userRouter from "./user";
import analysisRouter from "./analysis";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/user", userRouter);
router.use("/analysis", analysisRouter);
router.use("/subscription", subscriptionRouter);

export default router;
