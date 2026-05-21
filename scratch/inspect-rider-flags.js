import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: partners } = await supabase.from("delivery_partners").select("user_id, phone, name");
  const { data: users } = await supabase.from("users").select("id, phone, name, is_delivery_partner");
  
  const partnerPhones = new Set(partners?.map(p => String(p.phone).replace(/[^0-9]/g, '')));
  const partnerUserIds = new Set(partners?.map(p => p.user_id).filter(Boolean));
  
  let matches = 0;
  for (const u of users || []) {
    const cleanPhone = String(u.phone).replace(/[^0-9]/g, '');
    if (partnerPhones.has(cleanPhone) || partnerUserIds.has(u.id)) {
      matches++;
      console.log(`Match: Name="${u.name || u.full_name}", Phone="${u.phone}", is_delivery_partner=${u.is_delivery_partner}`);
    }
  }
  
  console.log(`Total matched users: ${matches}`);
}

check();
