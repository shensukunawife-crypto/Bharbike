import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Query all bikes
  const { data: bikes } = await sb.from('bikes').select('id, bike_code');
  // Query all vehicle mappings
  const { data: mappings } = await sb.from('vehicles').select('*');

  console.log(`\n=== MAPPING VERIFICATION ===`);
  console.log(`Total Bikes: ${bikes.length}`);
  console.log(`Total Mappings in 'vehicles' table: ${mappings.length}`);

  let missingCount = 0;
  bikes.forEach(b => {
    const mapping = mappings.find(m => m.bike_id === b.id);
    if (!mapping) {
      console.log(`❌ Bike ${b.bike_code} is NOT mapped.`);
      missingCount++;
    } else {
      console.log(`✅ Bike ${b.bike_code} is mapped -> UUID: ${mapping.vehicle_uuid}`);
    }
  });

  console.log(`\nVerification Result: ${missingCount === 0 ? '🎉 100% PERFECT! All bikes are fully mapped.' : `⚠️ ${missingCount} bikes are missing mappings.`}`);
}

main();
