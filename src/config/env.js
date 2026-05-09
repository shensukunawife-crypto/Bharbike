import dotenv from "dotenv";

dotenv.config();

const isProd = (process.env.NODE_ENV || "development") === "production";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey:
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  jwtSecret:
    process.env.JWT_SECRET ||
    (isProd ? "" : "dev-only-secret-change-in-production"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  demoOtp: process.env.DEMO_OTP || "123456",
  enableDemoOtp: String(process.env.ENABLE_DEMO_OTP || "").toLowerCase() === "true",
};

export function assertEnv() {
  const missing = [];
  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseServiceKey) {
    missing.push("SUPABASE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY)");
  }
  if (isProd && !process.env.JWT_SECRET) missing.push("JWT_SECRET");

  if (missing.length) {
    const msg = `[env] Missing: ${missing.join(", ")}`;
    console.error(msg);
    // Never exit: keep process alive for Railway healthcheck; fix vars in dashboard.
  }

  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    console.warn(
      "[env] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET unset — payment may use DB config only",
    );
  }
}

