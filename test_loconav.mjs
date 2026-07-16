// Test: Fetch ALL vehicles from LocoNav and check their location
import axios from 'axios';

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || 'https://api.a.loconav.com/integration/api/v1';
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || 'ctaSU6pp_7zJWTDH2YuS';

console.log('🔌 Connecting to LocoNav API...');
console.log('URL:', LOCONAV_API_URL);

// Step 1: List all vehicles registered in LocoNav account
try {
  const listRes = await axios.get(
    `${LOCONAV_API_URL}/vehicles`,
    {
      headers: {
        'User-Authentication': LOCONAV_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    }
  );
  
  const vehicles = listRes.data?.data || listRes.data || [];
  console.log('\n✅ LocoNav API connected!');
  console.log('Total vehicles in LocoNav account:', Array.isArray(vehicles) ? vehicles.length : 'unknown');
  
  if (Array.isArray(vehicles) && vehicles.length > 0) {
    console.log('\nVehicles found:');
    vehicles.forEach((v, i) => {
      console.log(`  ${i+1}. UUID: ${v.id || v.uuid || v.vehicle_id} | Name: ${v.name || v.registration_number || 'N/A'}`);
    });

    // Step 2: Get live location for all vehicles
    const vehicleIds = vehicles.map(v => v.id || v.uuid || v.vehicle_id).filter(Boolean);
    if (vehicleIds.length > 0) {
      console.log('\n📍 Fetching live locations...');
      const telemRes = await axios.post(
        `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
        {
          vehicleIds,
          sensors: ['speed', 'ignition', 'currentLocationCoordinates']
        },
        {
          headers: {
            'User-Authentication': LOCONAV_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      const telem = telemRes.data?.data?.values || [];
      console.log(`Got telemetry for ${telem.length} vehicles:`);
      telem.forEach((v, i) => {
        const coords = v.gps?.currentLocationCoordinates || {};
        const lat = coords.lat?.value;
        const lng = coords.long?.value;
        const ts = coords.lat?.timestamp ? new Date(coords.lat.timestamp * 1000).toLocaleString('en-IN') : 'N/A';
        console.log(`  ${i+1}. ID: ${v.vehicleId}`);
        console.log(`     Lat: ${lat || 'NO DATA'} | Lng: ${lng || 'NO DATA'}`);
        console.log(`     Last seen: ${ts}`);
      });
    }
  } else {
    console.log('\nRaw response:', JSON.stringify(listRes.data, null, 2).slice(0, 500));
  }

} catch (err) {
  console.error('\n❌ LocoNav API Error:');
  console.error('Status:', err.response?.status);
  console.error('Message:', err.response?.data || err.message);
}
