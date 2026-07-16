import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkRecentUsers() {
  try {
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }
    
    console.log("Recent profiles:");
    users.forEach(u => {
      console.log(`ID: ${u.id} | Name: ${u.full_name} | Email: ${u.email} | Created At: ${u.created_at}`);
    });
  } catch (err) {
    console.error("Failed to query DB:", err);
  }
}

checkRecentUsers();
