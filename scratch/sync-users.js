import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Use the service role key to bypass RLS!
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  try {
    console.log("Fetching profiles...");
    const { data: profiles, error: fetchErr } = await supabase
      .from("profiles")
      .select("*");
    
    if (fetchErr) {
      console.error("Failed to fetch profiles:", fetchErr);
      return;
    }

    console.log(`Found ${profiles.length} profiles. Syncing to users table...`);

    let successCount = 0;
    for (const p of profiles) {
      const payload = {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        location: p.location,
        created_at: p.created_at,
      };

      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(payload);

      if (upsertErr) {
        console.error(`Failed to upsert user ${p.id}:`, upsertErr.message);
      } else {
        successCount++;
      }
    }

    console.log(`Sync completed: ${successCount}/${profiles.length} users successfully synced!`);
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

sync();
