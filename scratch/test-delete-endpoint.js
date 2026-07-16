import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const ticketId = '1fdb1c71-5df3-487d-8830-af76e3829584'; // UUID of TNA022 ticket
  
  console.log(`Simulating query for ticket ID: ${ticketId}`);
  const { data: ticket, error: fetchErr } = await sb
    .from("maintenance")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();

  if (fetchErr) {
    console.error('Fetch Error:', fetchErr.message);
  } else {
    console.log('Ticket found:', ticket);
  }
}

main();
