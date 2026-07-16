import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test(url, token) {
  console.log(`\nTesting LocoNav URL: ${url}`);
  console.log(`Using Token: ${token}`);
  try {
    const res = await axios.get(`${url}/vehicles`, {
      headers: {
        'User-Authentication': token,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });
    console.log('✅ Connected successfully!');
    const list = res.data?.data || res.data || [];
    console.log('Total vehicles returned:', Array.isArray(list) ? list.length : 'unknown');
    if (Array.isArray(list)) {
      list.slice(0, 5).forEach((v, i) => {
        console.log(`  ${i+1}. Name: ${v.name || v.registration_number} | UUID: ${v.id || v.uuid || v.vehicle_id}`);
      });
    }
  } catch (err) {
    console.error('❌ Failed!');
    console.error('Status:', err.response?.status);
    console.error('Data:', err.response?.data);
  }
}

async function main() {
  const token = process.env.LOCONAV_TOKEN || '5Xo7xJxMHGD_nPb6Nc3B';
  
  // Test 1: Configured URL
  await test(process.env.LOCONAV_API_URL || 'https://app.loconav.sensorise.net/integration/api/v1', token);

  // Test 2: Developer default URL
  await test('https://api.a.loconav.com/integration/api/v1', token);
}

main();
