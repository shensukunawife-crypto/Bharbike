import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.post(
  "/login",
  [
    body("phone").trim().isLength({ min: 10 }).withMessage("Valid phone required"),
    body("otp").trim().notEmpty().withMessage("OTP required"),
    body("name").optional().trim().isLength({ min: 1 }),
  ],
  validateRequest,
  authController.login
);

export default r;
