import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: partners } = await supabase.from("delivery_partners").select("id, user_id, phone, name");
  const { data: users } = await supabase.from("users").select("id, phone, name");
  
  const userIds = new Set(users?.map(u => u.id));
  const userPhones = new Set(users?.map(u => String(u.phone).replace(/[^0-9]/g, '')));
  
  let idOverlap = 0;
  let phoneOverlap = 0;
  
  for (const p of partners || []) {
    if (p.user_id && userIds.has(p.user_id)) {
      idOverlap++;
    }
    const cleanPhone = String(p.phone).replace(/[^0-9]/g, '');
    if (userPhones.has(cleanPhone)) {
      phoneOverlap++;
    }
  }
  
  console.log(`Total delivery partners: ${partners?.length}`);
  console.log(`Partners with overlapping user_id in 'users': ${idOverlap}`);
  console.log(`Partners with matching phone in 'users': ${phoneOverlap}`);
}

check();
