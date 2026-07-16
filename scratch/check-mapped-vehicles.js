import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: vehicles, error } = await sb.from('vehicles').select('*');
  if (error) {
    console.error('Error fetching vehicles:', error.message);
    return;
  }
  console.log('Total vehicles mapped in vehicles table:', vehicles.length);
  vehicles.forEach((v, i) => {
    console.log(`${i+1}. Bike ID: ${v.bike_id} | LocoNav UUID: ${v.vehicle_uuid}`);
  });
}

main();
