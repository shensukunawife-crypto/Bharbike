import supabase from "../src/utils/supabaseClient.js";
import bcrypt from "bcryptjs";

async function verifyLiveAuth() {
  console.log("Verifying sub-admin login on live Render server...");
  
  const email = "timesmedia00@gmail.com";
  const tempPassword = "tempPassword12345";
  
  try {
    // 1. Fetch current hash to restore later
    const { data: admin, error: fetchErr } = await supabase
      .from("admin_users")
      .select("password_hash")
      .eq("email", email)
      .maybeSingle();
      
    if (fetchErr || !admin) {
      console.error("Failed to fetch admin:", fetchErr);
      return;
    }
    
    const originalHash = admin.password_hash;
    
    // 2. Hash new temp password
    const newHash = await bcrypt.hash(tempPassword, 10);
    
    // 3. Update database
    await supabase.from("admin_users").update({ password_hash: newHash }).eq("email", email);
    console.log("Temporarily updated password hash in database.");
    
    // 4. Send POST login request to the live Render server (case-insensitive email input)
    console.log("Sending POST login request to Render...");
    const res = await fetch("https://bharbike-backend.onrender.com/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "TiMeSmEdIa00@GmAiL.cOm", // mixed case email
        password: tempPassword
      })
    });
    
    console.log("Response Status:", res.status);
    const data = await res.json();
    console.log("Response Data:", data);
    
    // 5. Restore original hash
    await supabase.from("admin_users").update({ password_hash: originalHash }).eq("email", email);
    console.log("Restored original password hash in database.");
    
    if (res.ok && data.token) {
      console.log("✅ SUCCESS: Sub-admin login is verified and working on the live Render server!");
    } else {
      console.log("❌ FAILURE: Live login failed!");
    }
    
  } catch (err) {
    console.error("Error during live auth verification:", err.message);
  }
}

verifyLiveAuth();
