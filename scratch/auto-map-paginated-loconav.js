import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  let allVehicles = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    let success = false;
    let attempts = 0;
    let delay = 15000;

    while (!success && attempts < 5) {
      attempts++;
      console.log(`[Page ${page}] Fetching vehicles (Attempt ${attempts})...`);
      try {
        const res = await axios.get(`${url}/vehicles?page=${page}`, {
          headers: {
            'User-Authentication': token,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const pageVehicles = res.data?.data?.vehicles || res.data?.data || [];
        console.log(`[Page ${page}] Successfully fetched ${pageVehicles.length} vehicles.`);
        
        if (pageVehicles.length > 0) {
          allVehicles = allVehicles.concat(pageVehicles);
          page++;
          success = true;
        } else {
          hasMore = false;
          success = true;
        }
      } catch (err) {
        if (err.response?.status === 429) {
          console.log(`[Page ${page}] Rate limited (429). Waiting ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          delay += 10000;
        } else {
          console.error(`[Page ${page}] Request failed:`, err.response?.data || err.message);
          hasMore = false;
          break;
        }
      }
    }
  }

  console.log(`\n=== Total vehicles fetched from LocoNav: ${allVehicles.length} ===`);

  if (allVehicles.length === 0) {
    console.log('No vehicles retrieved from API.');
    return;
  }

  // Fetch all bikes and mappings from Supabase
  const { data: bikes } = await sb.from('bikes').select('id, bike_code');
  const { data: existingMappings } = await sb.from('vehicles').select('*');

  console.log(`Found ${bikes.length} bikes in database.`);
  console.log(`Found ${existingMappings.length} existing mappings in database.`);

  console.log('\n--- MAPPING ALL PAGINATED VEHICLES ---');
  let newMapped = 0;
  let updatedMapped = 0;

  for (const v of allVehicles) {
    const uuid = v.vehicleUuid || v.uuid || v.id;
    const name = v.displayNumber || v.number || v.name || v.registration_number;

    if (!uuid || !name) continue;

    const bike = bikes.find(b => String(b.bike_code).toLowerCase() === String(name).toLowerCase());
    if (!bike) {
      console.log(`⚠️ No bike found in database for LocoNav vehicle: ${name} (UUID: ${uuid})`);
      continue;
    }

    const exists = existingMappings.find(m => m.bike_id === bike.id || m.vehicle_uuid === uuid);
    if (exists) {
      if (exists.vehicle_uuid !== uuid || !exists.bike_id) {
        console.log(`⚡ Updating mapping mismatch: Bike ${bike.bike_code} -> UUID: ${uuid}`);
        await sb.from('vehicles')
          .update({ vehicle_uuid: uuid, bike_id: bike.id })
          .eq('id', exists.id);
        updatedMapped++;
      }
      continue;
    }

    console.log(`⚡ Creating NEW mapping: Bike ${bike.bike_code} (ID: ${bike.id}) <-> UUID: ${uuid}`);
    const { error: insertErr } = await sb.from('vehicles').insert([{
      bike_id: bike.id,
      vehicle_uuid: uuid
    }]);

    if (insertErr) {
      console.error(`   ❌ Failed:`, insertErr.message);
    } else {
      console.log(`   ✅ Successfully mapped!`);
      newMapped++;
    }
  }

  console.log(`\n=== AUTO-MAPPING RUN COMPLETE ===`);
  console.log(`Newly Mapped: ${newMapped}`);
  console.log(`Updated Mappings: ${updatedMapped}`);
}

main();
