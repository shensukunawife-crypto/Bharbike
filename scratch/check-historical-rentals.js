import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: rentals, error } = await sb.from('rentals').select('*');
  if (error) {
    console.error('Error fetching rentals:', error.message);
    return;
  }

  console.log(`Total rentals: ${rentals.length}`);
  
  // Resolve user and bike names
  const { data: bikes } = await sb.from('bikes').select('id, bike_code');
  const bikeMap = new Map(bikes?.map(b => [b.id, b.bike_code]) || []);
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  const userMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

  console.log('\n=== RENTAL HISTORY DETAILS ===');
  rentals.slice(-20).forEach(r => {
    const bCode = bikeMap.get(r.bike_id) || r.bike_id;
    const uName = userMap.get(r.user_id) || r.user_id;
    console.log(`Rental ID: ${r.id} | User: ${uName} | Bike: ${bCode} | Status: ${r.status} | Start: ${r.start_time} | End: ${r.end_time}`);
  });
}

main();
