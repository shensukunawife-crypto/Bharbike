import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  try {
    const res = await axios.get(`${url}/vehicles`, {
      headers: {
        'User-Authentication': token,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });
    
    const list = res.data?.data || res.data || [];
    console.log('\n--- LOCONAV VEHICLE REPORT ---');
    console.log('Total registered vehicles:', list.length);
    console.log('\nVehicle Details:');
    list.forEach((v, i) => {
      console.log(`${i+1}. UUID: ${v.uuid || v.id} | Name: ${v.name || v.registration_number || 'N/A'} | Code: ${v.vehicle_code || 'N/A'}`);
    });
  } catch (err) {
    console.error('LocoNav Error:', err.response?.data || err.message);
  }
}

main();
