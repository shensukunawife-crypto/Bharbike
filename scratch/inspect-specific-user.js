import supabase from "../src/utils/supabaseClient.js";

async function checkUser() {
  const userId = "24f64805-d01a-45ff-b052-8c28ba344629";
  console.log(`Inspecting user ID: ${userId}`);

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (pErr) {
    console.error("Profiles fetch error:", pErr);
  } else {
    console.log("Profiles row:", profile);
  }

  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (uErr) {
    console.error("Users fetch error:", uErr);
  } else {
    console.log("Users row:", user);
  }
}

checkUser();
