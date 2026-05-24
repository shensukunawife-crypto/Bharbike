import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController.js";
import { validateRequest } from "../middleware/validate.js";
import admin from "firebase-admin";
import { getFirebaseAdmin } from "../utils/firebaseAdmin.js";

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

r.get("/firebase-debug", (req, res) => {
  try {
    let parseError = null;
    let envVal = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
    let parsedValue = null;
    try {
      parsedValue = JSON.parse(envVal);
    } catch (e) {
      parseError = e.message;
    }

    const app = getFirebaseAdmin();
    return res.json({
      success: true,
      initialized: true,
      projectId: app.options.projectId,
      hasServiceAccountJson: !!envVal,
      serviceAccountLength: envVal.length,
      parseError,
    });
  } catch (err) {
    let envVal = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
    let parseError = null;
    try {
      JSON.parse(envVal);
    } catch (e) {
      parseError = e.message;
    }

    let maskedSnippet = "";
    if (envVal.length > 1286) {
      const rawSnippet = envVal.substring(Math.max(0, 1286 - 40), Math.min(envVal.length, 1286 + 40));
      maskedSnippet = rawSnippet.replace(/[A-Za-z]/g, 'x').replace(/[0-9]/g, '9');
    }

    return res.json({
      success: false,
      initialized: false,
      error: err.message,
      parseError,
      hasServiceAccountJson: !!envVal,
      serviceAccountLength: envVal.length,
      startChars: envVal.substring(0, 80),
      endChars: envVal.substring(envVal.length - 80),
      maskedSnippet,
      envKeys: Object.keys(process.env).filter(k => k.toLowerCase().includes("firebase")),
    });
  }
});

export default r;
