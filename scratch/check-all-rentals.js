import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: rentals, error } = await sb.from('rentals').select('*');
  if (error) {
    console.error('Error fetching rentals:', error.message);
    return;
  }

  console.log(`Total rentals in table: ${rentals.length}`);
  const statusCounts = {};
  rentals.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  console.log('Status counts:', statusCounts);
}

main();
