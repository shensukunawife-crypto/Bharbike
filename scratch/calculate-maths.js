import supabase from "../src/utils/supabaseClient.js";

async function run() {
  const { data: users } = await supabase.from("users").select("id, is_delivery_partner");
  const { data: partners } = await supabase.from("delivery_partners").select("id, status");
  
  const totalUsers = users?.length || 0;
  const ridersInUsers = users?.filter(u => u.is_delivery_partner === true).length || 0;
  const customersInUsers = totalUsers - ridersInUsers;
  
  const totalRidersInPartners = partners?.length || 0;
  const approvedRiders = partners?.filter(p => p.status === "approved").length || 0;
  const rejectedRiders = partners?.filter(p => p.status === "rejected").length || 0;

  console.log("=== THE MATHEMATICS ===");
  console.log(`1. Total registered accounts in 'users' table: ${totalUsers}`);
  console.log(`2. Minus approved delivery partners (riders): -${ridersInUsers}`);
  console.log(`3. Equal to true customers/renters: ${customersInUsers}`);
  console.log("------------------------");
  console.log(`4. Total rider applications in 'delivery_partners': ${totalRidersInPartners}`);
  console.log(`   - Approved applications: ${approvedRiders}`);
  console.log(`   - Rejected applications: ${rejectedRiders}`);
}

run();
