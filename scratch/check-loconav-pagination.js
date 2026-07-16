import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  let success = false;
  let attempts = 0;
  let delay = 15000;

  while (!success && attempts < 5) {
    attempts++;
    console.log(`[Attempt ${attempts}] Fetching vehicle list with pagination details...`);
    try {
      const res = await axios.get(`${url}/vehicles`, {
        headers: {
          'User-Authentication': token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log('✅ Connected successfully!');
      console.log('Pagination Object:', res.data?.data?.pagination);
      
      // Let's print vehicle list length on page 1
      const vehicles = res.data?.data?.vehicles || [];
      console.log('Vehicles on page 1:', vehicles.length);
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
}

main();
