import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  console.log('Cleaning up duplicate maintenance tickets for bike 62 (TNA034)...');
  
  // Delete the ticket with ticket_id = null since it was a bad entry
  const { data: delResult, error: delErr } = await sb.from('maintenance')
    .delete()
    .is('ticket_id', null);
  
  if (delErr) {
    console.error('Error deleting ticket_id = null:', delErr.message);
  } else {
    console.log('Deleted null ticket_id rows.');
  }

  // Let's print remaining rows to make sure it is correct
  const { data: rows } = await sb.from('maintenance').select('*');
  console.log('Current maintenance rows in database:', rows);
}

main();
