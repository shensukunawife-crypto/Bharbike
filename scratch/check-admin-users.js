import supabase from "../src/utils/supabaseClient.js";

async function checkAdminUsers() {
  console.log("=== Checking admin_users Table ===");
  try {
    const { data: admins, error } = await supabase
      .from("admin_users")
      .select("*");
    
    if (error) {
      console.error("❌ Error fetching admin_users:", error.message);
      console.error("Details:", error);
    } else {
      console.log(`✅ admin_users table exists! Total sub-admins found: ${admins?.length || 0}`);
      if (admins && admins.length > 0) {
        console.log("Sub-admins details:");
        admins.forEach(admin => {
          console.log(`- ID: ${admin.id}, Email: ${admin.email}, Name: ${admin.full_name}, Role: ${admin.role}, Active: ${admin.is_active}, Permissions: ${JSON.stringify(admin.permissions)}, Last Login: ${admin.last_login}`);
        });
      } else {
        console.log("No sub-admins found in table.");
      }
    }
  } catch (err) {
    console.error("❌ Unexpected script error:", err);
  }
}

checkAdminUsers();
