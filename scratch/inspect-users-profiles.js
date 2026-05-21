import supabase from "../src/utils/supabaseClient.js";

async function inspect() {
  const { data: profs } = await supabase.from("profiles").select("*").limit(1);
  const { data: usrs } = await supabase.from("users").select("*").limit(1);
  
  console.log("Profiles columns:", profs && profs.length > 0 ? Object.keys(profs[0]) : "No profiles data");
  console.log("Users columns:", usrs && usrs.length > 0 ? Object.keys(usrs[0]) : "No users data");
}

inspect();
