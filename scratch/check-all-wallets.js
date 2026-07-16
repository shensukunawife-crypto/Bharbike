import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkAll() {
  try {
    const { data: balances, error: balErr } = await supabase
      .from("wallet_balances")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(10);
    
    if (balErr) {
      console.error("Error:", balErr);
      return;
    }

    console.log("Recent wallet balances in DB:");
    for (const wb of balances) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", wb.user_id)
        .maybeSingle();
      
      console.log(`User ID: ${wb.user_id} | Email: ${profile?.email || "Unknown"} | Name: ${profile?.full_name || "Unknown"} | Balance: ${wb.balance} | Updated At: ${wb.updated_at}`);
    }
  } catch (err) {
    console.error("Failed:", err);
  }
}

checkAll();
