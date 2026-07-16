import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: bikes, error } = await sb.from('bikes').select('id, bike_code, status, location');
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Total bikes: ${bikes.length}`);
  const locationCounts = {};
  bikes.forEach(b => {
    locationCounts[b.location] = (locationCounts[b.location] || 0) + 1;
    if (b.location && b.location !== 'Unknown Yard') {
      console.log(`Bike ${b.bike_code} (status: ${b.status}) is at: ${b.location}`);
    }
  });

  console.log('Location summary:', locationCounts);
}

main();
