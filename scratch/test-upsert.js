import supabase from '../src/utils/supabaseClient.js';

async function testUpsert() {
  const userId = '8bc20f84-6794-46a4-891b-e156d13dd575'; // Kismat Ali
  
  const { data, error } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        plan_id: 'weekly',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        auto_renew: false,
      }, { onConflict: "user_id" });
      
  console.log("Upsert result:", { data, error });
}
testUpsert();
