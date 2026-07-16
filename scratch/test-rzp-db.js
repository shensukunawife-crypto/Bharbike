import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkDbConfigs() {
  try {
    const { data, error } = await supabase
      .from("payment_configs")
      .select("*");
    
    if (error) {
      console.error("Error fetching payment_configs:", error);
      return;
    }
    
    console.log("Found DB configs:", data);
  } catch (err) {
    console.error("Failed to query DB:", err);
  }
}

checkDbConfigs();
