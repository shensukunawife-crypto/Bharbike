import dotenv from 'dotenv';
dotenv.config();
import supabase from '../src/utils/supabaseClient.js';

async function run() {
  const { data, error } = await supabase.from('payment_configs').select('*');
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
}
run();
