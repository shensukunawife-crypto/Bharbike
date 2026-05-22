import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

let isServiceRole = false;

function getSupabaseKey() {
  const candidates = [
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: "SUPABASE_SERVICE_KEY", value: process.env.SUPABASE_SERVICE_KEY },
    { name: "SUPABASE_KEY", value: process.env.SUPABASE_KEY }
  ];

  const getRole = (key) => {
    if (!key) return null;
    try {
      const parts = key.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      return payload.role;
    } catch (e) {
      return null;
    }
  };

  // 1. Search for any key configured with a service_role
  for (const cand of candidates) {
    const role = getRole(cand.value);
    if (role === "service_role") {
      console.log(`✅ Using ${cand.name} (Decoded Role: ${role} - Bypasses RLS)`);
      isServiceRole = true;
      return cand.value;
    }
  }

  // 2. Fallback to any anon key
  for (const cand of candidates) {
    const role = getRole(cand.value);
    if (role === "anon") {
      console.log(`⚠️ Using ${cand.name} (Decoded Role: ${role} - Subject to RLS)`);
      isServiceRole = false;
      return cand.value;
    }
  }

  // 3. Literal fallback in case decoding fails
  const fallbackKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (fallbackKey) {
    console.log(`⚠️ Using Literal Fallback Key (Role could not be decoded)`);
    // Safe guess: if it contains service, assume true, else false
    isServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
    return fallbackKey;
  }

  console.error("❌ No Supabase key found in environment variables");
  isServiceRole = false;
  return null;
}

const supabaseKey = getSupabaseKey();

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

// Attach custom property to indicate if we bypassed RLS
supabase.isServiceRole = isServiceRole;

export default supabase;
