import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: partners } = await supabase.from("delivery_partners").select("id, status, phone, name, user_id");
  const { data: users } = await supabase.from("users").select("id, phone, is_delivery_partner");
  
  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  
  for (const p of partners || []) {
    stats[p.status] = (stats[p.status] || 0) + 1;
  }
  
  console.log("Rider statuses count:", stats);
}

check();
