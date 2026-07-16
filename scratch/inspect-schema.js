import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, full_name, phone, address")
    .not("address", "is", null)
    .limit(5);

  if (error) {
    console.error("Fetch error:", error);
  } else {
    console.log("Users with addresses in DB:", data);
  }
}

main();
