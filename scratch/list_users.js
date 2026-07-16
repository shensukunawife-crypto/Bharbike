import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  const [
    { data: users, error: err1 },
    { data: profiles, error: err2 }
  ] = await Promise.all([
    supabase.from("users").select("id"),
    supabase.from("profiles").select("id")
  ]);
  
  if (err1) console.error("Error users:", err1);
  if (err2) console.error("Error profiles:", err2);
  
  console.log(`Users table count: ${users?.length}`);
  console.log(`Profiles table count: ${profiles?.length}`);
  
  // Find profiles that are NOT in users table
  const userIds = new Set(users?.map(u => u.id) || []);
  const missing = profiles?.filter(p => !userIds.has(p.id)) || [];
  console.log(`Profiles missing from users table: ${missing.length}`);
  if (missing.length > 0) {
    console.log("Sample missing IDs:", missing.slice(0, 5).map(p => p.id));
  }
  process.exit(0);
}

main();
