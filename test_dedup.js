import supabase from "./src/utils/supabaseClient.js";

async function testDeduplication() {
  const { data: usersData } = await supabase.from("users").select("*");
  const users = (usersData || []).filter(r => !r.is_delivery_partner);

  console.log(`Raw users count: ${users.length}`);

  const computeInfoScore = (u) => {
    let score = 0;
    if (u.phone && String(u.phone).trim() && u.phone !== "null") score += 20;
    if (u.location && String(u.location).trim() && u.location !== "None" && u.location !== "N/A") score += 15;
    if (u.address && String(u.address).trim() && u.address !== "None") score += 15;
    if (u.email && !u.email.endsWith("@app.local")) score += 5;
    return score;
  };

  const deduplicatedUserMap = new Map();
  users.forEach(u => {
    const normName = (u.full_name || u.name || "").trim().toLowerCase();
    const normPhone = (u.phone || "").replace(/\D/g, "");
    const phoneKey = normPhone.length >= 10 ? normPhone.slice(-10) : normPhone;
    
    const key = normName ? `name:${normName}` : (phoneKey ? `phone:${phoneKey}` : `id:${u.id}`);
    
    if (!deduplicatedUserMap.has(key)) {
      deduplicatedUserMap.set(key, u);
    } else {
      const existing = deduplicatedUserMap.get(key);
      if (computeInfoScore(u) > computeInfoScore(existing)) {
        deduplicatedUserMap.set(key, u);
      }
    }
  });

  const finalUsers = Array.from(deduplicatedUserMap.values());
  console.log(`Deduplicated users count: ${finalUsers.length}`);

  const sonu = finalUsers.find(u => (u.full_name || "").toLowerCase().includes("sonu yadav"));
  console.log("\nKept Sonu Yadav:", sonu ? { name: sonu.full_name, phone: sonu.phone, location: sonu.location || sonu.address } : "None");

  const mahendra = finalUsers.find(u => (u.full_name || "").toLowerCase().includes("mahendra kumar"));
  console.log("Kept Mahendra Kumar:", mahendra ? { name: mahendra.full_name, phone: mahendra.phone, location: mahendra.location || mahendra.address } : "None");
}

testDeduplication().then(() => process.exit(0));
