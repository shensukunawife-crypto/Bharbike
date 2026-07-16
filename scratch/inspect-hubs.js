import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data, error } = await sb.from('hubs').select('*');
  if (error) {
    console.error('Error fetching hubs:', error.message);
    return;
  }

  console.log(`Total rows in hubs table: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    data.forEach(r => {
      console.log(r);
    });
  }
}

main();
