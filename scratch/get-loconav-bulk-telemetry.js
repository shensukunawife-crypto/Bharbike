import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  // Step 1: Fetch all vehicle UUIDs from Supabase
  const { data: mappings, error } = await sb.from('vehicles').select('*');
  if (error) {
    console.error('Error fetching mappings:', error.message);
    return;
  }

  const uuids = mappings.map(m => m.vehicle_uuid).filter(Boolean);
  console.log(`Found ${uuids.length} mapped vehicle UUIDs in database.`);

  if (uuids.length === 0) {
    console.log('No UUIDs found to query.');
    return;
  }

  // Step 2: Query LocoNav Telematics in BULK (one POST request)
  try {
    console.log('Querying LocoNav telematics in bulk...');
    const res = await axios.post(
      `${url}/vehicles/telematics/last_known`,
      {
        vehicleIds: uuids,
        sensors: ['gps', 'vehicleBatteryLevel', 'ignition', 'speed']
      },
      {
        headers: {
          'User-Authentication': token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const values = res.data?.data?.values || [];
    console.log(`\n=== LOCONAV BULK TELEMETRY REPORT (${values.length} vehicles returned) ===`);
    
    // Resolve profile/bike mappings to print friendly info
    const { data: bikes } = await sb.from('bikes').select('id, bike_code');
    const bikeMap = new Map(bikes?.map(b => [b.id, b.bike_code]) || []);

    values.forEach((v, i) => {
      const mapping = mappings.find(m => m.vehicle_uuid === v.vehicleId);
      const bikeId = mapping ? mapping.bike_id : null;
      const bikeCode = bikeId ? (bikeMap.get(bikeId) || `ID: ${bikeId}`) : 'Unmapped';

      const gps = v.gps || {};
      const coords = gps.currentLocationCoordinates || {};
      const lat = coords.lat?.value || null;
      const lng = coords.long?.value || null;
      const ign = gps.ignition?.value || 'N/A';
      const speed = gps.speed?.value ?? 'N/A';
      const battery = v.vehicleBatteryLevel?.value || 'N/A';

      console.log(`${i+1}. Vehicle ID: ${v.vehicleId} | Bike: ${bikeCode}`);
      console.log(`   Location: ${lat != null ? `${lat}, ${lng}` : 'No GPS Data'}`);
      console.log(`   Ignition: ${ign} | Speed: ${speed} km/h | Battery Voltage: ${battery}V`);
    });

  } catch (err) {
    console.error('LocoNav Bulk Error:', err.response?.data || err.message);
  }
}

main();
