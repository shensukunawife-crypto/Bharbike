import supabase from "./src/utils/supabaseClient.js";

async function findDuplicates() {
  const { data: usersData, error } = await supabase.from("users").select("*");
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(`Total users in DB: ${usersData.length}`);
  
  const nameMap = {};
  const phoneMap = {};

  usersData.forEach(u => {
    const name = (u.full_name || u.name || "").trim().toLowerCase();
    const rawPhone = (u.phone || "").replace(/\D/g, "");
    const phone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

    if (name) {
      if (!nameMap[name]) nameMap[name] = [];
      nameMap[name].push(u);
    }
    if (phone) {
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(u);
    }
  });

  console.log("\n--- DUPLICATE NAMES ---");
  for (const [name, list] of Object.entries(nameMap)) {
    if (list.length > 1) {
      console.log(`\nName: "${name}" (${list.length} entries):`);
      list.forEach(u => {
        console.log(`  - ID: ${u.id} | Phone: ${u.phone} | Email: ${u.email} | Address: ${u.location || u.address || 'None'}`);
      });
    }
  }

  console.log("\n--- DUPLICATE PHONES ---");
  for (const [phone, list] of Object.entries(phoneMap)) {
    if (list.length > 1) {
      console.log(`\nPhone: "${phone}" (${list.length} entries):`);
      list.forEach(u => {
        console.log(`  - ID: ${u.id} | Name: ${u.full_name} | Email: ${u.email}`);
      });
    }
  }
}

findDuplicates().then(() => process.exit(0));
