import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Checking KYC documents with ANON KEY...");

const supabase = createClient(supabaseUrl, anonKey);

async function runTest() {
  try {
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("id, type, file_url, status");

    if (error) {
      console.error("❌ Anon query failed:", error.message);
    } else {
      console.log(`✅ Anon query succeeded! Returned ${data?.length || 0} rows.`);
      if (data && data.length > 0) {
        console.log("Sample Anon rows:", data.slice(0, 2));
      }
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

runTest();
