const client = require('../src/utils/supabaseClient.js').default;
const iotService = require('../src/services/iotService.js');

async function check() {
  try {
    const { data: mappings } = await client.from('vehicles').select('*');
    console.log(`TOTAL VEHICLE MAPPINGS: ${mappings.length}`);
    
    // Test the first 5 mappings
    for (const mapping of mappings.slice(0, 8)) {
      console.log(`Testing Bike ID: ${mapping.bike_id} (UUID: ${mapping.vehicle_uuid})`);
      try {
        const health = await iotService.getBikeHealth(mapping.bike_id);
        console.log(`  Health Response:`, health);
      } catch (err) {
        console.error(`  Failed:`, err.message);
      }
      // Wait 1 second to avoid throttling
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error(err);
  }
}
check();
