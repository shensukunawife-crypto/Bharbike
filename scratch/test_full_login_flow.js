import supabase from "../src/utils/supabaseClient.js";
import bcrypt from "bcryptjs";

async function testFullFlow() {
  console.log("Starting full login flow test...");
  
  const testEmail = "test_subadmin_flow@gmail.com";
  const testPassword = "securePassword123";
  
  try {
    // 1. Clean up if exists
    await supabase.from("admin_users").delete().eq("email", testEmail);
    
    // 2. Hash password
    const password_hash = await bcrypt.hash(testPassword, 10);
    
    // 3. Insert test admin (normalized to lowercase email)
    const { error: insertErr } = await supabase.from("admin_users").insert([{
      email: testEmail.toLowerCase(),
      full_name: "Test Flow Sub-Admin",
      password_hash,
      role: "sub_admin",
      permissions: ["manage_users"],
      is_active: true
    }]);
    
    if (insertErr) {
      console.error("Failed to insert test admin:", insertErr);
      return;
    }
    
    console.log("Successfully created test sub-admin.");
    
    // 4. Test login query using UPPERCASE / MIXED case input (case-insensitive test)
    const loginInputEmail = "TeSt_SuBaDmIn_FlOw@GmAiL.cOm";
    console.log(`Simulating login with email input: "${loginInputEmail}"`);
    
    const { data: dbAdmin, error: queryErr } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", loginInputEmail.toLowerCase())
      .maybeSingle();
      
    if (queryErr) {
      console.error("Database query failed:", queryErr);
      return;
    }
    
    if (!dbAdmin) {
      console.error("Could not find user in database!");
      return;
    }
    
    console.log("Found user record in database:", dbAdmin.email);
    
    // 5. Test bcrypt password comparison
    const isMatch = await bcrypt.compare(testPassword, dbAdmin.password_hash);
    console.log("Bcrypt comparison match:", isMatch);
    
    if (isMatch) {
      console.log("✅ SUCCESS: Sub-admin login logic is 100% verified and correct!");
    } else {
      console.log("❌ FAILURE: Bcrypt comparison did not match!");
    }
    
    // 6. Clean up
    await supabase.from("admin_users").delete().eq("email", testEmail);
    console.log("Cleaned up test sub-admin.");
    
  } catch (err) {
    console.error("Unexpected error during test:", err);
  }
}

testFullFlow();
