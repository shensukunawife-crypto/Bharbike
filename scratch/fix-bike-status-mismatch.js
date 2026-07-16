import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Fix TNA040 - it has an ongoing rental so status should be in_use
  const { data, error } = await sb
    .from('bikes')
    .update({ status: 'in_use' })
    .eq('bike_code', 'TNA040')
    .select()
    .single();

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Fixed TNA040 status to in_use:', data.bike_code, '->', data.status);
  }

  // Also check if any other bikes have this same mismatch:
  // bikes marked 'available' but have an active ongoing rental
  console.log('\nChecking for other bikes with same mismatch...');

  const { data: ongoingRentals } = await sb
    .from('rentals')
    .select('bike_id')
    .eq('status', 'ongoing');

  const bikeIdsInUse = [...new Set((ongoingRentals || []).map(r => r.bike_id))];
  console.log(`Bikes with ongoing rentals: ${bikeIdsInUse.length} bikes`);

  if (bikeIdsInUse.length > 0) {
    const { data: mismatchedBikes } = await sb
      .from('bikes')
      .select('id, bike_code, status')
      .in('id', bikeIdsInUse)
      .neq('status', 'in_use');

    if (mismatchedBikes && mismatchedBikes.length > 0) {
      console.log(`Found ${mismatchedBikes.length} mismatched bikes (have ongoing rentals but wrong status):`);
      mismatchedBikes.forEach(b => console.log(`  - ${b.bike_code}: status is "${b.status}" but should be "in_use"`));

      // Fix all of them
      const mismatchedIds = mismatchedBikes.map(b => b.id);
      const { error: fixErr } = await sb
        .from('bikes')
        .update({ status: 'in_use' })
        .in('id', mismatchedIds);

      if (fixErr) {
        console.error('Error fixing mismatched bikes:', fixErr.message);
      } else {
        console.log('All mismatched bikes fixed to in_use!');
      }
    } else {
      console.log('No other mismatches found. All good!');
    }
  }
}

main();
