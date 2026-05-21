import supabase from "../src/utils/supabaseClient.js";

async function sync() {
  console.log("Fetching delivery partners...");
  const { data: partners } = await supabase.from("delivery_partners").select("id, phone, status, user_id");
  console.log("Fetching users...");
  const { data: users } = await supabase.from("users").select("id, phone, is_delivery_partner");
  
  if (!partners || !users) {
    console.error("Error: could not fetch tables");
    return;
  }
  
  const approvedPhones = new Set(
    partners
      .filter(p => p.status === "approved")
      .map(p => String(p.phone).replace(/[^0-9]/g, ''))
  );
  
  const approvedUserIds = new Set(
    partners
      .filter(p => p.status === "approved" && p.user_id)
      .map(p => p.user_id)
  );

  console.log(`Approved rider phones: ${approvedPhones.size}`);
  console.log(`Approved rider user_ids: ${approvedUserIds.size}`);
  
  let updatedCount = 0;
  for (const u of users) {
    const cleanPhone = String(u.phone).replace(/[^0-9]/g, '');
    const isApprovedRider = approvedPhones.has(cleanPhone) || approvedUserIds.has(u.id);
    
    if (isApprovedRider && !u.is_delivery_partner) {
      console.log(`Updating user: ID=${u.id}, Phone=${u.phone} -> is_delivery_partner = true`);
      const { error } = await supabase
        .from("users")
        .update({ is_delivery_partner: true })
        .eq("id", u.id);
        
      if (error) {
        console.error(`Error updating user ${u.id}:`, error.message);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Successfully updated ${updatedCount} users to is_delivery_partner = true.`);
}

sync();
