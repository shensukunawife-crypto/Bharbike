import dotenv from 'dotenv';
dotenv.config();
import supabase from '../src/utils/supabaseClient.js';

async function run() {
  const { data, error } = await supabase
    .from('maintenance')
    .select('*')
    .limit(10);

  console.log("Maintenance Table Check:", { data, error });
}

run();
