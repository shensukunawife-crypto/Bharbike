import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey:
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  demoOtp: process.env.DEMO_OTP || "123456",
};

export function assertEnv() {
  if (!env.supabaseUrl) {
    console.error("❌ SUPABASE_URL is missing in environment variables");
  }
  if (!env.supabaseServiceKey) {
    console.error(
      "❌ SUPABASE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY) is missing in environment variables",
    );
  }
}

