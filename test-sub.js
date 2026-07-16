import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  // Check subscription_plans table
  const { data: plans, error: pe } = await supabase.from('subscription_plans').select('*');
  if (pe) console.log('subscription_plans error:', pe.message);
  else console.log('subscription_plans:', JSON.stringify(plans, null, 2));

  // Check user_subscriptions table structure
  const { data: subs, error: se } = await supabase.from('user_subscriptions').select('*').limit(3);
  if (se) console.log('user_subscriptions error:', se.message);
  else console.log('user_subscriptions sample cols:', subs?.length ? Object.keys(subs[0]) : 'empty table');

  // Check payments table
  const { data: pays, error: paye } = await supabase.from('payments').select('*').limit(2);
  if (paye) console.log('payments error:', paye.message);
  else console.log('payments cols:', pays?.length ? Object.keys(pays[0]) : 'empty table');
}
test();
