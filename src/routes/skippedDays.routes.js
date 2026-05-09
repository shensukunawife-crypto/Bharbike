import { Router } from "express";
import * as skippedDaysController from "../controllers/skippedDaysController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(skippedDaysController.getSkippedDays));
router.post("/", asyncHandler(skippedDaysController.addSkippedDay));

export default router;
