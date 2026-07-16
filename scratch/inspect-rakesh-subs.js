import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const userId = '96797040-e796-43e0-aa9e-67ecfa0c0fbf';
  console.log(`Fetching all user_subscriptions for Rakesh Chaurasiya (${userId})...`);

  const { data: subs, error } = await sb
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${subs?.length || 0} subscriptions:`);
  subs?.forEach(s => console.log(s));
}

main();
