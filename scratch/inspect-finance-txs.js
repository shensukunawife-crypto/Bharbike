import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: txs, error: txErr } = await sb.from('wallet_transactions').select('*');
  console.log('Wallet transactions count:', txs?.length);
  console.log('All transactions:', txs);
  if (txErr) console.error('Error:', txErr.message);

  const { data: users, error: uErr } = await sb.from('users').select('id, full_name, phone');
  console.log('Users count:', users?.length);
  console.log('Users:', users);
  if (uErr) console.error('Error:', uErr.message);
}

main();
