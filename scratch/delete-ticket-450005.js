import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const ticketId = '450005d4-bb5f-4207-8b5b-d5babfb32ef6';
  console.log(`Manually deleting support ticket ${ticketId} from database...`);
  
  const { error } = await sb
    .from('maintenance')
    .delete()
    .eq('id', ticketId);

  if (error) {
    console.error('Error deleting ticket:', error.message);
  } else {
    console.log('Ticket deleted successfully!');
  }
}

main();
