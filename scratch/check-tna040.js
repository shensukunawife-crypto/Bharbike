import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Find bike TNA040
  const { data: bike } = await sb
    .from('bikes')
    .select('*')
    .ilike('bike_code', '%040%')
    .maybeSingle();

  console.log('BIKE TNA040:');
  console.log(bike);

  if (!bike) return;

  // Check active/ongoing rentals for this bike
  const { data: rentals } = await sb
    .from('rentals')
    .select('*')
    .eq('bike_id', bike.id)
    .in('status', ['ongoing', 'active'])
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\nONGOING RENTALS for TNA040:');
  console.log(rentals);

  // Check Chandan Kumar profile
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .ilike('full_name', '%chandan%')
    .maybeSingle();

  console.log('\nCHANDAN KUMAR PROFILE:');
  console.log(profile);

  if (profile) {
    // Check his latest rental
    const { data: chandanRentals } = await sb
      .from('rentals')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('\nCHANDAN KUMAR LATEST RENTALS:');
    console.log(chandanRentals);
  }
}

main();
