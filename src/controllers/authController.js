import { asyncHandler } from "../utils/asyncHandler.js";
import * as authService from "../services/authService.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginWithPhone(req.body);
  res.json({ success: true, data: result });
});

export const emailLogin = asyncHandler(async (req, res) => {
  const data = await authService.loginWithEmail({
    email: req.body?.email,
    password: req.body?.password,
  });
  if (data?.token) {
    res.cookie("auth_token", data.token, cookieOptions());
  }
  res.json({ success: true, data });
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function readCookie(cookieHeader, key) {
  const token = String(cookieHeader || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${key}=`));
  if (!token) return "";
  return decodeURIComponent(token.slice(key.length + 1));
}

function resolveAuthToken(req) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim()
    : "";
  const cookieToken = readCookie(req.headers.cookie || "", "auth_token");
  return bearer || cookieToken;
}

export const sendOtp = asyncHandler(async (req, res) => {
  const data = await authService.sendOtp({
    phone: req.body?.phone,
    ip: req.ip,
  });
  res.status(200).json({ success: true, data });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyOtp({
    phone: req.body?.phone,
    otp: req.body?.otp,
  });

  res.cookie("auth_token", data.token, cookieOptions());
  res.status(200).json({ success: true, data });
});

export const signup = asyncHandler(async (req, res) => {
  const data = await authService.signupWithEmail({
    email: req.body?.email,
    password: req.body?.password,
    full_name: req.body?.full_name,
  });
  if (data?.token) {
    res.cookie("auth_token", data.token, cookieOptions());
  }
  res.status(200).json({ success: true, data });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Logged out" });
});

// Firebase Phone Auth — mobile app sends Firebase ID token after OTP verification
export const verifyFirebaseToken = asyncHandler(async (req, res) => {
  const idToken = req.body?.idToken || req.body?.id_token;
  if (!idToken) {
    return res.status(422).json({ success: false, message: "idToken is required" });
  }
  const data = await authService.verifyWithFirebaseToken({ idToken });
  res.cookie("auth_token", data.token, cookieOptions());
  res.status(200).json({ success: true, data });
});

export const session = asyncHandler(async (req, res) => {
  const token = resolveAuthToken(req);
  if (!token) {
    return res.status(200).json({ success: true, data: { authenticated: false } });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        token,
        user: {
          id: payload.sub,
          phone: payload.phone || null,
        },
      },
    });
  } catch {
    return res.status(200).json({ success: true, data: { authenticated: false } });
  }
});
