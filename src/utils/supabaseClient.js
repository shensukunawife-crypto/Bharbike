import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY;

if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) {
  console.log("✅ Using Supabase SERVICE_ROLE_KEY (Bypasses RLS)");
} else if (process.env.SUPABASE_KEY) {
  console.log("⚠️ Using Supabase ANON_KEY (Subject to RLS)");
} else {
  console.error("❌ No Supabase key found in environment variables");
}

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase ENV variables");
}

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (err) {
  console.error("[supabaseClient] createClient failed:", err?.message || err);
  supabase = createClient("", "");
}

export default supabase;
