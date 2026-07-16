import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = '96797040-e796-43e0-aa9e-67ecfa0c0fbf'; // Rakesh Chaurasiya
  const targetEndDateStr = '2026-07-11T14:40:00.000Z';

  console.log(`Updating subscription for user ID ${userId} back to ${targetEndDateStr}...`);

  // 1. Fetch latest subscription
  const { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr || !sub) {
    console.error('Error fetching latest subscription:', subErr?.message || 'Not found');
    return;
  }

  // Determine status based on target date vs now
  const now = new Date();
  const targetDate = new Date(targetEndDateStr);
  const nextStatus = targetDate > now ? 'active' : 'expired';

  // 2. Update end_date and status
  const { data: updatedSub, error: updateErr } = await sb
    .from('user_subscriptions')
    .update({
      end_date: targetEndDateStr,
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sub.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Error updating subscription:', updateErr.message);
  } else {
    console.log('Subscription updated successfully:');
    console.log(updatedSub);
  }
}

main();
