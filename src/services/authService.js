import supabase from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../middleware/auth.js";
import { shapePublicUser } from "../utils/userShape.js";
import { env } from "../config/env.js";

const OTP_TTL_SECONDS = 60;
const OTP_THROTTLE_LIMIT = 3;
const OTP_THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const otpThrottle = new Map();
const DEMO_OTP = String(env.demoOtp || "123456").trim();

function isDemoOtpEnabled() {
  return env.enableDemoOtp === true;
}

function cleanupOtpThrottle(now = Date.now()) {
  for (const [key, value] of otpThrottle.entries()) {
    if (value.expiresAt <= now) otpThrottle.delete(key);
  }
}

function toIndianPhone(rawPhone) {
  const onlyDigits = String(rawPhone || "").replace(/\D/g, "");
  if (!onlyDigits) throw new AppError("Phone number is required", 422);

  let normalizedDigits = onlyDigits;
  if (onlyDigits.length === 10) {
    normalizedDigits = `91${onlyDigits}`;
  } else if (onlyDigits.length === 12 && onlyDigits.startsWith("91")) {
    normalizedDigits = onlyDigits;
  } else if (onlyDigits.length === 11 && onlyDigits.startsWith("0")) {
    normalizedDigits = `91${onlyDigits.slice(1)}`;
  } else {
    throw new AppError("Please enter a valid Indian mobile number", 422);
  }

  const national = normalizedDigits.slice(2);
  if (!/^[6-9]\d{9}$/.test(national)) {
    throw new AppError("Please enter a valid Indian mobile number", 422);
  }

  return `+${normalizedDigits}`;
}

function otpThrottleKey(phone, ip) {
  return `${phone}:${String(ip || "unknown")}`;
}

function assertOtpAllowed(phone, ip) {
  const now = Date.now();
  cleanupOtpThrottle(now);
  const key = otpThrottleKey(phone, ip);
  const rec = otpThrottle.get(key);

  if (!rec) {
    otpThrottle.set(key, { count: 1, expiresAt: now + OTP_THROTTLE_WINDOW_MS });
    return;
  }

  if (rec.count >= OTP_THROTTLE_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((rec.expiresAt - now) / 1000));
    throw new AppError("Too many OTP requests. Please try again shortly.", 429, {
      retry_after_seconds: retryAfterSec,
    });
  }

  rec.count += 1;
  otpThrottle.set(key, rec);
}

async function upsertProfileFromAuthUser(authUser, fallbackPhone) {
  const userId = authUser?.id;
  if (!userId) throw new AppError("Invalid auth user", 500);

  const phone = authUser?.phone || fallbackPhone || null;
  const fullName =
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split("@")?.[0] ||
    "Rider";

  const payload = {
    id: userId,
    full_name: fullName,
    email: authUser?.email || null,
    phone,
    location: null,
  };

  const { data, error } = await supabase.from("profiles").upsert(payload).select("*").single();
  if (error) {
    console.error("[authService.upsertProfileFromAuthUser] upsert failed", error);
    throw new AppError("Unable to prepare user profile", 500);
  }
  return shapePublicUser(data);
}

async function findProfileByPhone(phone) {
  const { data, error } = await supabase.from("profiles").select("*").eq("phone", phone).maybeSingle();
  if (error) {
    console.error("[authService.findProfileByPhone] lookup failed", error);
    throw new AppError("Unable to lookup demo profile", 500);
  }
  return data ? shapePublicUser(data) : null;
}

async function findProfileByEmail(email) {
  const { data, error } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  if (error) {
    console.error("[authService.findProfileByEmail] lookup failed", error);
    throw new AppError("Unable to lookup demo profile", 500);
  }
  return data ? shapePublicUser(data) : null;
}

async function ensureDemoProfileByPhone(phone) {
  const emailAlias = `${phone.replace(/\D/g, "")}@demo.local`;
  const demoPassword = `DemoOtp#${DEMO_OTP}`;
  const existingByPhone = await findProfileByPhone(phone);
  if (existingByPhone?.id) return existingByPhone;
  const existingByEmail = await findProfileByEmail(emailAlias);
  if (existingByEmail?.id) return existingByEmail;

  let authUser = null;
  const loginRes = await supabase.auth.signInWithPassword({
    email: emailAlias,
    password: demoPassword,
  });

  if (loginRes?.data?.user) {
    authUser = loginRes.data.user;
  } else {
    const signupRes = await supabase.auth.signUp({
      email: emailAlias,
      password: demoPassword,
      options: {
        data: { full_name: "Demo Rider", phone },
      },
    });

    if (signupRes?.data?.user) {
      authUser = signupRes.data.user;
    } else {
      if (String(signupRes?.error?.message || "").toLowerCase().includes("already registered")) {
        const fallbackProfile = await findProfileByEmail(emailAlias);
        if (fallbackProfile?.id) return fallbackProfile;
      }
      console.error("[authService.ensureDemoProfileByPhone] unable to create demo auth user", {
        loginError: loginRes?.error?.message,
        signupError: signupRes?.error?.message,
      });
      throw new AppError("Unable to create demo login user", 500);
    }
  }

  return upsertProfileFromAuthUser(authUser, phone);
}

export async function sendOtp({ phone, ip }) {
  const normalizedPhone = toIndianPhone(phone);
  assertOtpAllowed(normalizedPhone, ip);

  if (isDemoOtpEnabled()) {
    return {
      phone: normalizedPhone,
      otp_ttl_seconds: OTP_TTL_SECONDS,
      message: "Demo OTP mode enabled. OTP accepted for testing.",
      demo_otp_enabled: true,
      demo_otp_hint: DEMO_OTP,
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
    options: {
      shouldCreateUser: true,
      channel: "sms",
    },
  });

  if (error) {
    console.error("[authService.sendOtp] signInWithOtp failed", error);
    if (isDemoOtpEnabled()) {
      return {
        phone: normalizedPhone,
        otp_ttl_seconds: OTP_TTL_SECONDS,
        message: "SMS provider unavailable. Demo OTP mode active.",
        demo_otp_enabled: true,
        demo_otp_hint: DEMO_OTP,
      };
    }
    throw new AppError(error.message || "Unable to send OTP", 400);
  }

  return {
    phone: normalizedPhone,
    otp_ttl_seconds: OTP_TTL_SECONDS,
    message: "OTP sent successfully",
  };
}

export async function verifyOtp({ phone, otp }) {
  const normalizedPhone = toIndianPhone(phone);
  const code = String(otp || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new AppError("Please enter a valid 6-digit OTP", 422);
  }

  if (isDemoOtpEnabled() && code === DEMO_OTP) {
    const profile = await ensureDemoProfileByPhone(normalizedPhone);
    const appToken = signToken({
      id: profile.id,
      phone: normalizedPhone,
    });

    return {
      token: appToken,
      user: profile,
      supabase: null,
      demo_otp_used: true,
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizedPhone,
    token: code,
    type: "sms",
  });

  if (error || !data?.user || !data?.session) {
    console.error("[authService.verifyOtp] verifyOtp failed", error);
    throw new AppError("Invalid or expired OTP", 401);
  }

  const profile = await upsertProfileFromAuthUser(data.user, normalizedPhone);
  const appToken = signToken({
    id: data.user.id,
    phone: normalizedPhone,
  });

  return {
    token: appToken,
    user: profile,
    supabase: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    },
  };
}

export async function loginWithPhone({ phone, otp }) {
  return verifyOtp({ phone, otp });
}

export async function signupWithEmail({ email, password, full_name }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanEmail) throw new AppError("Email is required", 422);
  if (cleanPassword.length < 6) throw new AppError("Password must be at least 6 characters", 422);

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        full_name: String(full_name || "").trim() || undefined,
      },
    },
  });

  if (error || !data?.user) {
    console.error("[authService.signupWithEmail] signUp failed", error);
    throw new AppError(error?.message || "Unable to create account", 400);
  }

  const profile = await upsertProfileFromAuthUser(data.user, null);
  const appToken = signToken({
    id: data.user.id,
    phone: data.user.phone || null,
  });

  return {
    token: appToken,
    user: profile,
    needs_email_verification: !data.session,
    supabase: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          token_type: data.session.token_type,
        }
      : null,
  };
}
