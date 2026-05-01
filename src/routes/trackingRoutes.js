import { Router } from "express";
import { getRouteHistory, getTracking } from "../controllers/trackingController.js";

const router = Router();

router.get("/tracking/:id", getTracking);
router.get("/routes/:id", getRouteHistory);

export default router;
