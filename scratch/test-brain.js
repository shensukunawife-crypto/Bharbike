import supabase from '../src/utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../src/services/subscriptionBrain.js';

async function testBrain() {
  const phone = '+919152171732'; // Nabirul Shekh
  
  // Find User ID
  const { data: users } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id FROM users WHERE phone = '${phone}'`
  });
  const userId = users[0].id;
  
  console.log("--- 1. BREAKING SUBSCRIPTION ---");
  await supabase.from("user_subscriptions").update({ status: 'cancelled' }).eq("user_id", userId);
  
  console.log("--- 2. TRIGGERING BRAIN ---");
  await verifyAndHealSubscription(userId, 1950);
  
  console.log("--- 3. CHECKING RESULTS ---");
  const { data: subs } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT status, start_date, end_date FROM user_subscriptions WHERE user_id = '${userId}'`
  });
  console.log("Current Subscription Status:", subs[0]);
}
testBrain();
