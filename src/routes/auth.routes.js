import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.post(
  "/send-otp",
  [body("phone").trim().notEmpty().withMessage("Phone is required")],
  validateRequest,
  authController.sendOtp
);

r.post(
  "/verify-otp",
  [
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  validateRequest,
  authController.verifyOtp
);

r.post(
  "/login",
  [
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  validateRequest,
  authController.login
);

r.post(
  "/signup",
  [
    body("email").trim().isEmail().withMessage("Valid email required"),
    body("password").trim().isLength({ min: 6 }).withMessage("Password must be at least 6 chars"),
    body("full_name").optional().trim().isLength({ min: 1 }),
  ],
  validateRequest,
  authController.signup
);

r.post("/logout", authController.logout);
r.get("/session", authController.session);

export default r;
