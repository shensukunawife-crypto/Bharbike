import { Router } from "express";
import { getRouteHistory, getTracking } from "../controllers/trackingController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/tracking/:id", asyncHandler(getTracking));
router.get("/routes/:id", asyncHandler(getRouteHistory));

export default router;
