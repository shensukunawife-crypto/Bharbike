import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const riderName = 'rakesh chaurasiya';
  const userId = '96797040-e796-43e0-aa9e-67ecfa0c0fbf';
  
  console.log(`Syncing skipped days for ${riderName}...`);

  // 1. Fetch all active skipped days for this rider
  const { data: skippedRecords, error: sErr } = await sb
    .from('rider_skipped_days')
    .select('*')
    .eq('status', 'Active');

  if (sErr) {
    console.error('Error fetching skipped days:', sErr.message);
    return;
  }

  // Filter records matching rakesh chaurasiya (case-insensitive)
  const rakeshRecords = skippedRecords.filter(r => r.rider_name?.toLowerCase().includes('rakesh chaurasiya'));
  console.log(`Found ${rakeshRecords.length} active skipped day records for Rakesh:`);
  let totalSkippedDays = 0;
  rakeshRecords.forEach(r => {
    console.log(`- Start: ${r.skipped_start_date} | End: ${r.skipped_end_date} | Days: ${r.days_skipped} | Reason: ${r.reason}`);
    totalSkippedDays += Number(r.days_skipped || 0);
  });
  console.log(`Total skipped days to add: ${totalSkippedDays} days`);

  // 2. Fetch Rakesh's latest subscription
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

  console.log('\nCurrent subscription in DB:');
  console.log(sub);

  // 3. Let's update the subscription. Rakesh's original subscription end date was July 6.
  // With 6 skipped days added, the new end date should be: July 6 + 6 days = July 12.
  const baseEndDate = new Date('2026-07-06T14:40:00Z');
  const newEndDate = new Date(baseEndDate.getTime() + totalSkippedDays * 24 * 60 * 60 * 1000);
  
  // Since newEndDate (July 12) is in the future compared to July 11, the subscription is active!
  const now = new Date();
  const nextStatus = newEndDate > now ? 'active' : 'expired';

  console.log(`\nProposed update:`);
  console.log(`- New End Date: ${newEndDate.toISOString()}`);
  console.log(`- New Status: ${nextStatus}`);

  const { data: updatedSub, error: updateErr } = await sb
    .from('user_subscriptions')
    .update({
      end_date: newEndDate.toISOString(),
      status: nextStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', sub.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Error updating subscription:', updateErr.message);
  } else {
    console.log('\nSubscription updated successfully:');
    console.log(updatedSub);
  }
}

main();
