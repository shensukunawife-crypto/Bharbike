import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

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
