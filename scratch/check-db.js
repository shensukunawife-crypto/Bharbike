import supabase from "../src/utils/supabaseClient.js";

async function checkDatabase() {
  console.log("=== DB SUMMARY ===");
  try {
    const { data: kycDocs, error: kycErr } = await supabase
      .from("kyc_documents")
      .select("*");
    
    if (kycErr) {
      console.error("❌ Error fetching kyc_documents:", kycErr.message);
    } else {
      console.log(`✅ kyc_documents: ${kycDocs?.length || 0} rows total`);
      if (kycDocs && kycDocs.length > 0) {
        console.log("Sample kyc_documents:", kycDocs.slice(0, 3));
      }
    }

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone");

    if (profErr) {
      console.error("❌ Error fetching profiles:", profErr.message);
    } else {
      console.log(`✅ profiles: ${profiles?.length || 0} rows total`);
      if (profiles && profiles.length > 0) {
        console.log("Sample profiles:", profiles.slice(0, 3));
      }
    }

    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, full_name, phone, driving_license_url, electricity_bill_url");

    if (userErr) {
      console.error("❌ Error fetching users:", userErr.message);
    } else {
      console.log(`✅ users: ${users?.length || 0} rows total`);
      if (users && users.length > 0) {
        console.log("Sample users:", users.slice(0, 3));
      }
    }
  } catch (err) {
    console.error("❌ Unexpected script error:", err);
  }
}

checkDatabase();
