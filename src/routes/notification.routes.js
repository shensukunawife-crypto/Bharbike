import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get notification settings
router.get("/settings", notificationController.getSettings);

// Update notification settings
router.put("/settings", notificationController.updateSettings);

export default router;
