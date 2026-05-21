import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const { data: users } = await supabase.from("users").select("id, name, phone");
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone");
  
  const userIds = new Set(users?.map(u => u.id));
  const profileIds = new Set(profiles?.map(p => p.id));
  
  let overlap = 0;
  for (const id of profileIds) {
    if (userIds.has(id)) {
      overlap++;
    }
  }
  
  console.log(`Overlap count (IDs present in both): ${overlap}`);
  console.log(`Profiles unique IDs: ${profiles?.length - overlap}`);
  console.log(`Users unique IDs: ${users?.length - overlap}`);
}

check();
