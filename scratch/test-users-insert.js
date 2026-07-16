import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testInsert() {
  try {
    const payload = {
      id: "58d87fe5-e81b-4ed9-b129-2f813825598c",
      full_name: "Erees",
      email: "test@admin.in",
      phone: "+919999999999",
      location: null,
    };

    const { data, error } = await supabase
      .from("users")
      .upsert(payload)
      .select();
    
    console.log("Upsert users result:", data, "| Error:", error);
  } catch (err) {
    console.error("Failed to insert:", err);
  }
}

testInsert();
