import { Router } from "express";
import * as subscriptionController from "../controllers/subscriptionController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Public routes
router.get("/plans", subscriptionController.getPlans);

// Protected routes (require authentication)
router.get("/active", subscriptionController.getActiveSubscription);
router.get("/history", subscriptionController.getSubscriptionHistory);
router.get("/billing", subscriptionController.getBillingHistory);
router.get("/check", subscriptionController.checkSubscription);
router.post("/create", subscriptionController.createSubscription);
router.post("/cancel", subscriptionController.cancelSubscription);
router.patch("/auto-renew", subscriptionController.updateAutoRenew);

export default router;
