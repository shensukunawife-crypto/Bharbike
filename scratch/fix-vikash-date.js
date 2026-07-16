import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', '%vikash%');

  if (!profiles || profiles.length === 0) return;
  const targetUserId = profiles[0].id;
  
  const newEndDate = "2026-07-14T14:30:00.000Z"; // July 14, 2:30 PM (matching his start time)

  // 1. Update Subscription
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (sub) {
    await sb
      .from('user_subscriptions')
      .update({ end_date: newEndDate, updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    console.log("Updated subscription end date to:", newEndDate);
  }

  // 2. Update active rental
  const { data: rental } = await sb
    .from('rentals')
    .select('*')
    .eq('user_id', targetUserId)
    .in('status', ['ongoing', 'active'])
    .maybeSingle();

  if (rental) {
    await sb
      .from('rentals')
      .update({ end_time: newEndDate })
      .eq('id', rental.id);
    console.log("Updated rental end time to:", newEndDate);
  }
}

main();
