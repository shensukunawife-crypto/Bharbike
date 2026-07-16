import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
  const { count: profilesCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { count: ordersCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const { count: bikesCount } = await supabase.from("bikes").select("*", { count: "exact", head: true });
  const { count: adminsCount } = await supabase.from("admin_users").select("*", { count: "exact", head: true });
  const { count: earningsCount } = await supabase.from("earnings").select("*", { count: "exact", head: true });

  console.log("📊 Wipe Verification Status:");
  console.log(`- Customer Users: ${usersCount}`);
  console.log(`- Customer Profiles: ${profilesCount}`);
  console.log(`- Orders: ${ordersCount}`);
  console.log(`- Bikes: ${bikesCount}`);
  console.log(`- Admin Users: ${adminsCount}`);
  console.log(`- Earnings Records: ${earningsCount}`);
}
check();
