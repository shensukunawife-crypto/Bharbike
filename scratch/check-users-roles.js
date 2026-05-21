import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: users } = await supabase.from("users").select("id, is_delivery_partner, full_name, phone");
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone");
  
  const ridersInUsers = users?.filter(u => u.is_delivery_partner === true) || [];
  const normalInUsers = users?.filter(u => u.is_delivery_partner !== true) || [];
  
  console.log(`Total users in 'users' table: ${users?.length}`);
  console.log(`Riders in 'users' table: ${ridersInUsers.length}`);
  console.log(`Customers in 'users' table: ${normalInUsers.length}`);
  console.log(`Total profiles in 'profiles' table: ${profiles?.length}`);
}

check();
