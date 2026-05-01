import { Router } from "express";
import * as skippedDaysController from "../controllers/skippedDaysController.js";

const router = Router();

router.get("/", skippedDaysController.getSkippedDays);
router.post("/", skippedDaysController.addSkippedDay);

export default router;
