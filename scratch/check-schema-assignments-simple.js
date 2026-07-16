import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Let's check if profiles table has assigned_bike_code by querying one row
  const { data: profileRow } = await sb.from('profiles').select('*').limit(1);
  if (profileRow && profileRow.length > 0) {
    console.log('Profiles columns:', Object.keys(profileRow[0]));
    
    // Query all profiles where assigned_bike_code is not null
    if ('assigned_bike_code' in profileRow[0]) {
      const { data: assigned } = await sb.from('profiles')
        .select('id, full_name, assigned_bike_code')
        .not('assigned_bike_code', 'is', null);
      console.log('\nProfiles with assigned_bike_code:', assigned);
    }
  }

  // Let's check if bikes table has any user fields
  const { data: bikeRow } = await sb.from('bikes').select('*').limit(1);
  if (bikeRow && bikeRow.length > 0) {
    console.log('Bikes columns:', Object.keys(bikeRow[0]));
  }
}

main();
