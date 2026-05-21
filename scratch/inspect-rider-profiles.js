import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: partners } = await supabase.from("delivery_partners").select("id, user_id, phone, name");
  const { data: profiles } = await supabase.from("profiles").select("id, phone, full_name");
  
  const profileIds = new Set(profiles?.map(p => p.id));
  const profilePhones = new Set(profiles?.map(p => String(p.phone).replace(/[^0-9]/g, '')));
  
  let idOverlap = 0;
  let phoneOverlap = 0;
  
  for (const p of partners || []) {
    if (p.user_id && profileIds.has(p.user_id)) {
      idOverlap++;
    }
    const cleanPhone = String(p.phone).replace(/[^0-9]/g, '');
    if (profilePhones.has(cleanPhone)) {
      phoneOverlap++;
    }
  }
  
  console.log(`Total delivery partners: ${partners?.length}`);
  console.log(`Partners with overlapping user_id in 'profiles': ${idOverlap}`);
  console.log(`Partners with matching phone in 'profiles': ${phoneOverlap}`);
}

check();
