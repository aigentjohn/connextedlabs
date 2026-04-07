import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pathwaysRouter from "./pathways";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pathwaysRouter);

export default router;
