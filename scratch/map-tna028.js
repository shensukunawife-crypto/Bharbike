import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  // Find bike ID for TNA028
  const { data: bike } = await sb.from('bikes').select('id, bike_code').eq('bike_code', 'TNA028').maybeSingle();
  
  if (bike) {
    console.log(`Found Bike TNA028 in database with ID: ${bike.id}`);
    
    // Check if it's already in the vehicles table
    const { data: existing } = await sb.from('vehicles').select('*').eq('bike_id', bike.id).maybeSingle();
    
    const loconavUuid = 'c534eeeb-e58e-4979-960c-52fdcaeff8ca'; // UUID of TNA0028 in LocoNav
    
    if (existing) {
      console.log(`Updating existing mapping for TNA028 to UUID: ${loconavUuid}`);
      await sb.from('vehicles').update({ vehicle_uuid: loconavUuid }).eq('id', existing.id);
    } else {
      console.log(`Inserting new mapping for TNA028 to UUID: ${loconavUuid}`);
      await sb.from('vehicles').insert([{ bike_id: bike.id, vehicle_uuid: loconavUuid }]);
    }
    console.log('✅ Bike TNA028 mapped successfully!');
  } else {
    console.log('Bike TNA028 not found in database.');
  }
}

main();
