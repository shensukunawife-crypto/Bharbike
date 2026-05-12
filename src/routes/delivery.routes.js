import { Router } from "express";
import { body } from "express-validator";
import * as deliveryController from "../controllers/deliveryController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.post("/apply", deliveryController.apply);

r.get("/status", deliveryController.status);

r.post(
  "/online",
  [
    authMiddleware,
    body("is_online")
      .isBoolean({ strict: true })
      .withMessage("is_online must be true or false"),
  ],
  validateRequest,
  deliveryController.setOnline
);

// Partner Dashboard endpoints
r.get("/dashboard/:userId", deliveryController.getDashboard);
r.get("/orders/:userId", deliveryController.getOrders);
r.get("/earnings/:userId", deliveryController.getEarnings);

export default r;
