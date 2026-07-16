import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  // 1. Fetch all mappings
  const { data: mappings } = await sb.from('vehicles').select('*');
  const uuids = mappings.map(m => m.vehicle_uuid).filter(Boolean);

  console.log(`Querying GPS coordinates for ${uuids.length} mapped vehicles in bulk...`);

  // 2. Fetch last known telematics in one bulk request
  try {
    const res = await axios.post(
      `${url}/vehicles/telematics/last_known`,
      {
        vehicleIds: uuids,
        sensors: ['gps', 'vehicleBatteryLevel']
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
    console.log(`LocoNav returned telemetry for ${values.length} vehicles.`);

    // 3. Update bikes in Supabase
    let updatedCount = 0;
    for (const val of values) {
      const mapping = mappings.find(m => m.vehicle_uuid === val.vehicleId);
      if (!mapping) continue;

      const coords = val.gps?.currentLocationCoordinates || {};
      const lat = coords.lat?.value;
      const lng = coords.long?.value;

      if (lat && lng) {
        const gpsLocationStr = `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
        const pingDate = coords.lat?.timestamp ? new Date(coords.lat.timestamp * 1000) : new Date();

        // Calculate battery % from voltage
        let batteryPct = 85;
        const batteryData = val.vehicleBatteryLevel;
        if (batteryData && typeof batteryData.value === 'number') {
          const voltage = batteryData.value;
          let calculatedPct = Math.round(((voltage - 11.0) / 1.8) * 100);
          batteryPct = Math.max(0, Math.min(100, calculatedPct));
        }

        const { error } = await sb.from('bikes')
          .update({
            last_lat: lat,
            last_lng: lng,
            location: gpsLocationStr,
            battery: batteryPct,
            last_ping_at: pingDate.toISOString()
          })
          .eq('id', mapping.bike_id);

        if (error) {
          console.error(`❌ Failed to update bike ID ${mapping.bike_id}:`, error.message);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Successfully updated GPS/Battery data for ${updatedCount} bikes!`);

  } catch (err) {
    console.error('LocoNav Telematics error:', err.response?.data || err.message);
  }
}

main();
