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
    const qUsers = await supabase.from("users").select("*", { count: "exact", head: true }).neq("is_delivery_partner", true);
    const qBikesCount = await supabase.from("bikes").select("*", { count: "exact", head: true });
    const qRentals = await supabase.from("rentals").select("*", { count: "exact", head: true }).eq("status", "active");
    const qBikes = await supabase.from("bikes").select("*");
    const qOrders = await supabase.from("orders").select("*");
    const qEarnings = await supabase.from("earnings").select("amount, created_at");

    return res.json({
      success: true,
      isServiceRole: supabase.isServiceRole,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      queries: {
        users: { count: qUsers.count, error: qUsers.error, status: qUsers.status },
        bikesCount: { count: qBikesCount.count, error: qBikesCount.error, status: qBikesCount.status },
        rentals: { count: qRentals.count, error: qRentals.error, status: qRentals.status },
        bikes: { dataLength: qBikes.data?.length, error: qBikes.error, status: qBikes.status },
        orders: { dataLength: qOrders.data?.length, error: qOrders.error, status: qOrders.status },
        earnings: { dataLength: qEarnings.data?.length, error: qEarnings.error, status: qEarnings.status },
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default r;
