import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: bikes, error } = await sb.from('bikes').select('id, bike_code, status, is_locked, battery');
  if (error) {
    console.error('Error fetching bikes:', error.message);
    return;
  }

  console.log('=== BIKE LOCK STATUS IN DATABASE ===');
  
  // Group by locked status
  const locked = bikes.filter(b => b.is_locked);
  const unlocked = bikes.filter(b => !b.is_locked);

  console.log(`Total Locked in DB: ${locked.length}`);
  console.log(`Total Unlocked in DB: ${unlocked.length}`);

  console.log('\n--- UNLOCKED BIKES IN FLEET ---');
  unlocked.forEach(b => {
    console.log(`Bike: ${b.bike_code} | Status: ${b.status} | Locked: ${b.is_locked} | Battery: ${b.battery}%`);
  });

  console.log('\n--- LOCKED BIKES IN FLEET ---');
  locked.forEach(b => {
    console.log(`Bike: ${b.bike_code} | Status: ${b.status} | Locked: ${b.is_locked} | Battery: ${b.battery}%`);
  });
}

main();
