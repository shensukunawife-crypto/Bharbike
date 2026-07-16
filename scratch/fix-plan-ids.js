import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Find all subscriptions with old plan_id values
  const { data: oldSubs, error } = await sb
    .from('user_subscriptions')
    .select('id, user_id, plan_id, status')
    .in('plan_id', ['weekly', 'monthly', 'weekly_plan_old', 'plan_weekly']);

  if (error) {
    console.error('Error fetching subs:', error.message);
    return;
  }

  console.log(`Found ${oldSubs?.length || 0} subscriptions with old plan_id values:`);
  console.log(oldSubs);

  if (!oldSubs || oldSubs.length === 0) {
    console.log('Nothing to fix.');
    return;
  }

  // Map old plan IDs to new ones
  const planIdMap = {
    'weekly': 'weekly_plan',
    'monthly': 'monthly_plan',
    'weekly_plan_old': 'weekly_plan',
    'plan_weekly': 'weekly_plan',
  };

  for (const sub of oldSubs) {
    const newPlanId = planIdMap[sub.plan_id];
    if (!newPlanId) {
      console.log(`Skipping ${sub.id} — no mapping for plan_id: ${sub.plan_id}`);
      continue;
    }

    const { error: updateErr } = await sb
      .from('user_subscriptions')
      .update({ plan_id: newPlanId })
      .eq('id', sub.id);

    if (updateErr) {
      console.error(`Failed to update sub ${sub.id}:`, updateErr.message);
    } else {
      console.log(`✅ Fixed sub ${sub.id} for user ${sub.user_id}: ${sub.plan_id} → ${newPlanId}`);
    }
  }

  console.log('\n--- DONE ---');
}

main();
