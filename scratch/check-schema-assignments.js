import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Let's get column names for 'bikes' and 'profiles'
  const { data: bikeCols } = await sb.rpc('exec_sql', {
    sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'bikes';"
  });
  const { data: profileCols } = await sb.rpc('exec_sql', {
    sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';"
  });

  console.log('Bikes columns:', bikeCols?.map(c => c.column_name));
  console.log('Profiles columns:', profileCols?.map(c => c.column_name));

  // Let's check if any profiles have an assigned bike code
  const { data: assignedProfiles } = await sb.from('profiles').select('id, full_name, assigned_bike_code').not('assigned_bike_code', 'is', null);
  console.log('\nProfiles with assigned_bike_code:', assignedProfiles);

  // Let's check if any bikes have user assignment columns if they exist
  const { data: assignedBikes } = await sb.from('bikes').select('*');
  console.log('\nChecking if any bike has an assignment column set...');
  assignedBikes.forEach(b => {
    // print if any field other than standard id, bike_code, status, created_at, updated_at is populated
    const keys = Object.keys(b).filter(k => !['id', 'bike_code', 'status', 'created_at', 'updated_at', 'model', 'color', 'year', 'registration_number', 'last_ping_at', 'latitude', 'longitude'].includes(k));
    keys.forEach(k => {
      if (b[k] !== null && b[k] !== undefined) {
        console.log(`Bike ${b.bike_code} has ${k}: ${b[k]}`);
      }
    });
  });
}

main();
