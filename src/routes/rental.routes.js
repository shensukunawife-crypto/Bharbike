import { Router } from "express";
import { body } from "express-validator";
import { RentalPlan } from "../constants/dbEnums.js";
import * as rentalController from "../controllers/rentalController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.use(authMiddleware);

r.post(
  "/start",
  [
    body("plan")
      .isIn(Object.values(RentalPlan))
      .withMessage("plan must be daily, weekly, or monthly"),
  ],
  validateRequest,
  rentalController.start
);

r.post(
  "/end",
  [body("rentalId").isUUID().withMessage("rentalId must be UUID")],
  validateRequest,
  rentalController.end
);

export default r;
