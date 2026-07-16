import supabase from '../src/utils/supabaseClient.js';

async function fixKismatSub() {
  const userId = '8bc20f84-6794-46a4-891b-e156d13dd575'; // Kismat Ali
  
  // The system uses + 6 days for a weekly plan so it's 7 days inclusive
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000); // + 6 days
  
  const { data, error } = await supabase
      .from("user_subscriptions")
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        plan_id: 'weekly',
      })
      .eq("user_id", userId);
      
  console.log("Fixed subscription again:", { error, endDate });
}
fixKismatSub();
