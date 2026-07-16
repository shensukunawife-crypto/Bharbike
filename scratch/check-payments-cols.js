import dotenv from 'dotenv';
dotenv.config();
import supabase from '../src/utils/supabaseClient.js';

async function run() {
  const { data, error } = await supabase.from('payments').select('*').limit(1);
  console.log('Result:', { data, error });
}
run();
