import { Router } from "express";
import { body } from "express-validator";
import * as smartLockController from "../controllers/smartLockController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

// All smartlock routes require authentication
r.use(authMiddleware);

// Get lock status
r.get("/status", smartLockController.getLockStatus);

// Lock the bike
r.post("/lock", smartLockController.lockBike);

// Unlock the bike
r.post(
  "/unlock",
  [
    body("method")
      .optional()
      .isIn(["app", "qr", "bluetooth"])
      .withMessage("Method must be app, qr, or bluetooth"),
  ],
  validateRequest,
  smartLockController.unlockBike
);

// Get bike health
r.get("/health", smartLockController.getBikeHealth);

// Get recent alerts
r.get("/alerts", smartLockController.getAlerts);

export default r;
