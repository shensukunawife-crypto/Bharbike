import { Router } from "express";
import { body } from "express-validator";
import * as deliveryController from "../controllers/deliveryController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.use(authMiddleware); // Secure all delivery routes

r.post("/apply", deliveryController.apply);

r.get("/status", deliveryController.status);

r.post(
  "/online",
    body("is_online")
      .isBoolean({ strict: true })
      .withMessage("is_online must be true or false"),
  ],
  validateRequest,
  deliveryController.setOnline
);

// Partner Dashboard endpoints
r.get("/dashboard", deliveryController.getDashboard);
r.get("/orders", deliveryController.getOrders);
r.get("/earnings", deliveryController.getEarnings);

export default r;
