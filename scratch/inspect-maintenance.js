import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data, error } = await sb.from('maintenance').select('*');
  if (error) {
    console.error('Error fetching maintenance:', error.message);
    return;
  }

  console.log(`Total rows in maintenance table: ${data.length}`);
  data.forEach(r => {
    console.log(`ID (UUID): ${r.id} | TicketCode: ${r.ticket_id} | Bike ID: ${r.bike_id} | BikeCode: ${r.bike_code} | Status: ${r.status}`);
  });
}

main();
