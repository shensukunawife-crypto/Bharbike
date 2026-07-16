import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testUsers() {
  try {
    const { count: usersCount, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .neq("is_delivery_partner", true);
    
    console.log("Users query result:", { usersCount, usersError });

    // Let's also check profiles table count
    const { count: profilesCount, error: profilesError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    console.log("Profiles query result:", { profilesCount, profilesError });

    // Let's print users schema or try to read one row
    const { data: oneUser, error: oneUserError } = await supabase
      .from("users")
      .select("*")
      .limit(1);
    
    console.log("One user from users table:", oneUser, "| Error:", oneUserError);

  } catch (err) {
    console.error("Test failed:", err);
  }
}

testUsers();
