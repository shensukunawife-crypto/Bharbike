import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb
    .from('user_subscriptions')
    .select('id, user_id, start_date, end_date, plan_id')
    .eq('status', 'active')
    .eq('plan_id', 'weekly_plan');

  if (!subs || subs.length === 0) {
    console.log("No active weekly subscriptions found.");
    return;
  }

  console.log(`Found ${subs.length} active weekly subscriptions:\n`);

  for (const sub of subs) {
    const start = new Date(sub.start_date);
    const end = new Date(sub.end_date);
    
    // Mathematical difference in exactly 24-hour periods
    const msDiff = end.getTime() - start.getTime();
    const exactDays = msDiff / (1000 * 60 * 60 * 24);
    
    // Inclusive calendar days (End Date - Start Date + 1)
    // To do this simply by date strings:
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    console.log(`Sub ID: ${sub.id.substring(0,8)} | User: ${sub.user_id.substring(0,8)}`);
    console.log(`   Start: ${start.toLocaleString()}`);
    console.log(`   End:   ${end.toLocaleString()}`);
    console.log(`   Exact Hours Diff: ${Math.round(msDiff / (1000 * 60 * 60))} hours`);
    console.log(`   Mathematical Days (End - Start): ${exactDays.toFixed(2)} days`);
    console.log("-----------------------------------------");
  }
}

main();
