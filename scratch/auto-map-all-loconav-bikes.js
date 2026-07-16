import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  let list = [];
  let success = false;
  let attempts = 0;
  let delay = 15000;

  while (!success && attempts < 5) {
    attempts++;
    console.log(`[Attempt ${attempts}] Querying all registered vehicles (limit=100)...`);
    try {
      const res = await axios.get(`${url}/vehicles?limit=100`, {
        headers: {
          'User-Authentication': token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      list = res.data?.data?.vehicles || res.data?.data || [];
      console.log('✅ Connected successfully!');
      console.log('Total vehicles returned by limit=100:', list.length);
      console.log('Pagination info:', res.data?.data?.pagination);
      success = true;
    } catch (err) {
      if (err.response?.status === 429) {
        console.log(`❌ Rate limited (429). Retrying in ${delay / 1000} seconds...`);
        await new Promise(r => setTimeout(r, delay));
        delay += 10000;
      } else {
        console.error('❌ Request failed:', err.response?.data || err.message);
        break;
      }
    }
  }

  if (!list.length) {
    console.log('No vehicles found from LocoNav API or API query failed.');
    return;
  }

  // Fetch all bikes and existing vehicle mappings from Supabase
  const { data: bikes } = await sb.from('bikes').select('id, bike_code');
  const { data: existingMappings } = await sb.from('vehicles').select('*');

  console.log(`\nFound ${bikes.length} bikes in database.`);
  console.log(`Found ${existingMappings.length} existing vehicle mappings in database.`);

  console.log('\n--- STARTING AUTO-MAPPING FOR ALL VEHICLES ---');
  let mappedCount = 0;

  for (const v of list) {
    const uuid = v.vehicleUuid || v.uuid || v.id;
    const name = v.displayNumber || v.number || v.name || v.registration_number;

    if (!uuid || !name) continue;

    // Find bike in database with matching code
    const bike = bikes.find(b => String(b.bike_code).toLowerCase() === String(name).toLowerCase());
    if (!bike) {
      console.log(`⚠️ No bike found in database for LocoNav vehicle: ${name} (UUID: ${uuid})`);
      continue;
    }

    // Check if a mapping already exists for this bike or UUID
    const exists = existingMappings.find(m => m.bike_id === bike.id || m.vehicle_uuid === uuid);
    if (exists) {
      // Mapping exists, just print log
      // Check if the mapped UUID matches
      if (exists.vehicle_uuid !== uuid) {
        console.log(`⚡ Updating mapping mismatch: Bike ${bike.bike_code} (current UUID in DB: ${exists.vehicle_uuid}) -> New UUID: ${uuid}`);
        await sb.from('vehicles').update({ vehicle_uuid: uuid }).eq('id', exists.id);
        mappedCount++;
      }
      continue;
    }

    // Insert new mapping
    console.log(`⚡ Creating NEW mapping: Bike ${bike.bike_code} (ID: ${bike.id}) <-> LocoNav UUID: ${uuid}`);
    const { error: insertErr } = await sb.from('vehicles').insert([{
      bike_id: bike.id,
      vehicle_uuid: uuid
    }]);

    if (insertErr) {
      console.error(`   ❌ Failed to insert mapping:`, insertErr.message);
    } else {
      console.log(`   ✅ Successfully mapped!`);
      mappedCount++;
    }
  }

  console.log(`\n--- AUTO-MAPPING COMPLETE. Mapped/Updated ${mappedCount} bikes. ---`);
}

main();
