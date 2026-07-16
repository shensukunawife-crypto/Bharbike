import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";
import { shapePublicUser } from "../src/utils/userShape.js";

// Safe data helper
const safeData = (d) => (Array.isArray(d) ? d : []);

// Shape public user from shape
function shapePublicUserLocal(row) {
  if (!row || typeof row !== "object") return row;
  return {
    id: row.id,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    location: row.location ?? null,
    image_url: (row.image_url || row.avatar_url) ?? null,
    emergency_contact_name: row.emergency_contact_name ?? null,
    emergency_contact_phone: row.emergency_contact_phone ?? null,
    created_at: row.created_at ?? null,
  };
}

async function main() {
  const { data: usersData, error: usersError } = await supabase.from("users").select("*");
  if (usersError) {
    console.error("❌ usersError:", usersError);
    return;
  }
  
  console.log(`Fetched raw usersData count: ${usersData.length}`);

  const usersFiltered = safeData(usersData)
    .filter((row) => row.is_delivery_partner !== true);
    
  console.log(`After is_delivery_partner !== true filter count: ${usersFiltered.length}`);
  
  const mappedUsers = usersFiltered.map((row) => {
    const normalizedRow = {
      ...row,
      full_name: row.full_name || row.name || null,
    };
    const base = shapePublicUserLocal(normalizedRow);
    const joinedDate = row.created_at || row.createdAt || new Date().toISOString();
    const isBlocked = row.is_blocked === true || row.status === "blocked";
    
    return {
      ...base,
      email: base.email || `${String(base.phone || "user").replace(/\s+/g, "")}@app.local`,
      statusLabel: isBlocked ? "Blocked" : "Active",
      isBlocked,
      joinedDate,
    };
  });
  
  console.log(`Mapped users count: ${mappedUsers.length}`);
  
  const finalFiltered = mappedUsers.filter((user) => {
    // Let's check with empty search, status = all, date = empty
    const search = "";
    const statusFilter = "all";
    const dateFilter = "";
    
    if (
      search &&
      !String(user.full_name || "").toLowerCase().includes(search) &&
      !String(user.phone || "").toLowerCase().includes(search) &&
      !String(user.email || "").toLowerCase().includes(search) &&
      !String(user.location || "").toLowerCase().includes(search)
    ) {
      return false;
    }
    if (statusFilter !== "all") {
      if (statusFilter === "active" && user.isBlocked) return false;
      if (statusFilter === "blocked" && !user.isBlocked) return false;
    }
    if (dateFilter && String(user.joinedDate).slice(0, 10) !== dateFilter) {
      return false;
    }
    return true;
  });

  console.log(`Final filtered users count: ${finalFiltered.length}`);
  
  console.log("Sample final users (first 3):");
  finalFiltered.slice(0, 3).forEach((u, i) => {
    console.log(`[${i+1}] ID: ${u.id}, full_name: ${u.full_name}, phone: ${u.phone}, email: ${u.email}`);
  });
  
  process.exit(0);
}

main();
