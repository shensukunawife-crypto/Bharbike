import supabase from "../src/utils/supabaseClient.js";

async function checkNotifications() {
  console.log("Checking if notifications table exists...");
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Notifications table error:", error.message);
  } else {
    console.log("Notifications table exists! Columns:", data.length > 0 ? Object.keys(data[0]) : "Empty table");
  }
}

checkNotifications();
