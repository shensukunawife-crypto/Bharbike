import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  const url = process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1';

  let success = false;
  let attempts = 0;
  let delay = 15000; // Wait 15s first since we hit rate limit

  while (!success && attempts < 5) {
    attempts++;
    console.log(`\n[Attempt ${attempts}] Fetching vehicle list from LocoNav...`);
    try {
      const res = await axios.get(`${url}/vehicles`, {
        headers: {
          'User-Authentication': token,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const list = res.data?.data || res.data || [];
      console.log('✅ Connected successfully!');
      console.log('Total vehicles registered in LocoNav:', list.length);
      console.log('\n--- LocoNav Vehicles ---');
      list.forEach((v, i) => {
        console.log(`${i+1}. UUID: ${v.uuid || v.id} | Name: ${v.name || v.registration_number || 'N/A'}`);
      });
      success = true;
    } catch (err) {
      if (err.response?.status === 429) {
        console.log(`❌ Rate limited (429). Retrying in ${delay / 1000} seconds...`);
        await new Promise(r => setTimeout(r, delay));
        delay += 10000; // Increase wait time by 10s each time
      } else {
        console.error('❌ Request failed:', err.response?.data || err.message);
        break;
      }
    }
  }
}

main();
