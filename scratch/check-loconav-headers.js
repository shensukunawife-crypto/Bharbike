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
    console.log('Success headers:', res.headers);
  } catch (err) {
    console.log('Error status:', err.response?.status);
    console.log('Error headers:', err.response?.headers);
  }
}

main();
