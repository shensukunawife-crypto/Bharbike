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
    console.log(`[Attempt ${attempts}] Querying LocoNav raw response...`);
    try {
      const res = await axios.get(`${url}/vehicles`, {
        headers: {
          'User-Authentication': token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log('✅ Connected successfully!');
      console.log('Raw response type:', typeof res.data);
      console.log('Keys of raw response:', Object.keys(res.data));
      if (res.data && res.data.data) {
        console.log('Keys of raw response.data:', Object.keys(res.data.data));
        console.log('Type of raw response.data:', typeof res.data.data);
        console.log('Is array:', Array.isArray(res.data.data));
      }
      console.log('\n--- Full Response JSON ---');
      console.log(JSON.stringify(res.data, null, 2).slice(0, 1000));
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
