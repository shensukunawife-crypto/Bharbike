import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  console.log('--- RESTORING PREVIOUS BIKE ASSIGNMENTS ---');

  // 1. Fetch all rentals that expired recently (in the last 24 hours)
  const oneDayAgo = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const { data: expiredRentals, error: err1 } = await sb.from('rentals')
    .select('*')
    .eq('status', 'expired')
    .gt('end_time', oneDayAgo);

  if (err1) {
    console.error('Error fetching expired rentals:', err1.message);
    return;
  }

  console.log(`Found ${expiredRentals.length} recently expired rentals to analyze.`);

  // 2. Fetch all active subscriptions
  const { data: activeSubs } = await sb.from('user_subscriptions')
    .select('*')
    .eq('status', 'active');

  // 3. Fetch bikes and profiles for details
  const { data: bikes } = await sb.from('bikes').select('id, bike_code');
  const bikeMap = new Map(bikes?.map(b => [b.id, b.bike_code]) || []);
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

  let restoreCount = 0;

  for (const rental of expiredRentals) {
    // Check if the user has an active subscription
    const activeSub = activeSubs.find(s => s.user_id === rental.user_id);
    if (!activeSub) {
      console.log(`ℹ️ Skipping ${userMap.get(rental.user_id) || rental.user_id} - No active subscription found.`);
      continue;
    }

    // Check if they already have an active/ongoing rental now (to prevent double assignment)
    const { data: currentActive } = await sb.from('rentals')
      .select('id')
      .eq('user_id', rental.user_id)
      .in('status', ['active', 'ongoing'])
      .maybeSingle();

    if (currentActive) {
      console.log(`ℹ️ Skipping ${userMap.get(rental.user_id)} - Already has an active rental now.`);
      continue;
    }

    const bikeCode = bikeMap.get(rental.bike_id) || rental.bike_id;
    const userName = userMap.get(rental.user_id) || rental.user_id;

    console.log(`⚡ Restoring Bike ${bikeCode} to ${userName}:`);
    console.log(`   Subscription ends: ${activeSub.end_date}`);

    // Create a new rental matching the subscription's end_date
    const startTime = new Date();
    const endTime = new Date(activeSub.end_date);
    const diffMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.max(24, Math.round(diffMs / (1000 * 60 * 60)));

    const { error: insertErr } = await sb.from('rentals').insert([{
      bike_id: rental.bike_id,
      user_id: rental.user_id,
      duration: durationHours,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'ongoing',
      price: 0
    }]);

    if (insertErr) {
      console.error(`   ❌ Failed to insert rental record:`, insertErr.message);
    } else {
      // Update bike status
      const { error: bikeErr } = await sb.from('bikes')
        .update({ status: 'in_use', is_locked: false })
        .eq('id', rental.bike_id);
      
      if (bikeErr) {
        console.error(`   ❌ Failed to update bike status:`, bikeErr.message);
      } else {
        console.log(`   ✅ Restored successfully!`);
        restoreCount++;
      }
    }
  }

  console.log(`\n=== RESTORATION RUN COMPLETE: Restored ${restoreCount} assignments ===`);
}

main();
