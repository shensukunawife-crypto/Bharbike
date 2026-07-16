import supabase from "../src/utils/supabaseClient.js";

async function check() {
  const ramId = "70658f94-dfb8-4f5a-8f05-e9c26d49659f";
  const vishalId = "b9d0a488-5af5-46a0-9efe-3f7e2c4b9d30";

  console.log("Checking KYC status...");
  
  const { data: ramKyc } = await supabase.from("kyc_documents").select("*").eq("user_id", ramId);
  console.log("Ram KYC Documents:", ramKyc);

  const { data: vishalKyc } = await supabase.from("kyc_documents").select("*").eq("user_id", vishalId);
  console.log("Vishal KYC Documents:", vishalKyc);
}

check();
