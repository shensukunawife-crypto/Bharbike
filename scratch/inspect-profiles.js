import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: profiles, error } = await sb.from('profiles').select('id, full_name, phone');
  console.log('Profiles count:', profiles?.length);
  console.log('Profiles:', profiles);
  if (error) console.error('Error:', error.message);
}

main();
