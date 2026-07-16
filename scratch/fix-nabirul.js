import supabase from '../src/utils/supabaseClient.js';

async function fixNabirulSub() {
  const phone = '+919152171732'; // Nabirul Shekh
  
  // Find User ID
  const { data: users } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id FROM users WHERE phone = '${phone}'`
  });
  
  if (!users || users.length === 0) {
    console.log("User not found.");
    return;
  }
  const userId = users[0].id;
  
  const startDate = new Date(); // Start today, July 15
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000); // 7 days inclusive
  
  const { data, error } = await supabase
      .from("user_subscriptions")
      .upsert({
        user_id: userId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        plan_id: 'weekly',
        auto_renew: false
      }, { onConflict: "user_id" });
      
  console.log("Fixed Nabirul's subscription:", { error, endDate });
}
fixNabirulSub();
