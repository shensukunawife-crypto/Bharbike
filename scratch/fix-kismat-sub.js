import supabase from '../src/utils/supabaseClient.js';

async function fixKismatSub() {
  const userId = '8bc20f84-6794-46a4-891b-e156d13dd575'; // Kismat Ali
  
  // Start date today, end date 7 days from now (Weekly Plan)
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
      .from("user_subscriptions")
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        plan_id: 'weekly',
      })
      .eq("user_id", userId);
      
  console.log("Fixed subscription:", { error });
}
fixKismatSub();
