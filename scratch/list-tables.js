import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data, error } = await sb.rpc('exec_sql', {
    sql_query: "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'"
  });
  console.log('Tables:', data);
  if (error) console.error('Error:', error.message);
}

main();
