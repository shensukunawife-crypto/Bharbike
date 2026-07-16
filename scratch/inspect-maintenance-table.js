import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data, error } = await sb.rpc('exec_sql', {
    sql_query: "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'maintenance'"
  });
  console.log('Columns:', data);
  if (error) console.error('Error:', error.message);
}

main();
