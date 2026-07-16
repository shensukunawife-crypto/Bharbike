import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = '0c9dca3b-3ab5-49cb-95f7-538a0d428b39'; // Rakesh shetty ID - wait, Vikash is 96797040... Wait, I need to fetch Vikash's ID dynamically
  
  const { data: profiles } = await sb
    .from('profiles')
    .select('id')
    .ilike('full_name', '%vikash%');
    
  if(!profiles || profiles.length === 0) return;
  const targetUserId = profiles[0].id;
  
  // 1. Check all skipped days for Vikash
  const { data: skippedDays } = await sb
    .from('rider_skipped_days')
    .select('*')
    .ilike('rider_name', '%vikash%');
    
  console.log("Skipped Days for Vikash:");
  console.log(skippedDays);

  // 2. Check if admin manually updated the subscription recently (from logs if any, or just check the dates again)
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  console.log("\nSubscription Details:");
  console.log(sub);
}

main();
