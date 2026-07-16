const supabase = require('../src/utils/supabaseClient.js').default;

async function run() {
  const { data, error } = await supabase.from("users").select("*").limit(5);
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Users Columns and Data:", data);
  }
}

run();
