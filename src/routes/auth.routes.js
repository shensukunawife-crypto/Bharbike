import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import { validateRequest } from "../middleware/validate.js";
import supabase from "../utils/supabaseClient.js";

const r = Router();

r.post(
  "/send-otp",
  [body("phone").trim().notEmpty().withMessage("Phone is required")],
  validateRequest,
  authController.sendOtp
);

// Firebase Phone Auth — mobile app verifies OTP via Firebase SDK then sends ID token here
r.post(
  "/firebase-verify",
  [body("idToken").trim().notEmpty().withMessage("Firebase idToken is required")],
  validateRequest,
  authController.verifyFirebaseToken
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

r.post(
  "/email-login",
  [
    body("email").trim().isEmail().withMessage("Valid email required"),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  authController.emailLogin
);

r.post("/logout", authController.logout);
r.get("/session", authController.session);

r.get("/debug-supabase", async (req, res) => {
  try {
    const { count: usersCount, error: usersErr } = await supabase.from("users").select("id", { count: "exact", head: true });
    return res.json({
      success: true,
      isServiceRole: supabase.isServiceRole,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasSupabaseKey: !!process.env.SUPABASE_KEY,
      usersCount: usersErr ? `Error: ${usersErr.message}` : usersCount,
      envKeys: Object.keys(process.env).filter(k => k.toLowerCase().includes("supabase")),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default r;
