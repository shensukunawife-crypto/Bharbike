import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const query = 'Rakesh Chaurasiya';
  console.log(`Searching database for user: "${query}"...`);

  // 1. Search in profiles
  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('*')
    .ilike('full_name', `%${query}%`);

  if (pErr) {
    console.error('Error fetching profiles:', pErr.message);
  } else {
    console.log(`Profiles found: ${profiles?.length || 0}`);
    profiles?.forEach(p => console.log(JSON.stringify(p, null, 2)));
  }

  // 2. Search in users
  const { data: users, error: uErr } = await sb
    .from('users')
    .select('*')
    .ilike('full_name', `%${query}%`);

  if (uErr) {
    console.error('Error fetching users:', uErr.message);
  } else {
    console.log(`\nUsers found: ${users?.length || 0}`);
    users?.forEach(u => console.log(JSON.stringify(u, null, 2)));
  }

  // 3. If any user ID is found, fetch their subscriptions, wallet transactions, and payments
  const matchingId = profiles?.[0]?.id || users?.[0]?.id;
  if (matchingId) {
    console.log(`\nFetching details for User ID: ${matchingId}...`);

    const { data: subs } = await sb.from('user_subscriptions').select('*').eq('user_id', matchingId);
    console.log(`Subscriptions (${subs?.length || 0}):`);
    subs?.forEach(s => console.log(s));

    const { data: payments } = await sb.from('payments').select('*').eq('user_id', matchingId).order('created_at', { ascending: false });
    console.log(`\nPayments (${payments?.length || 0}):`);
    payments?.forEach(p => console.log(p));

    const { data: txs } = await sb.from('wallet_transactions').select('*').eq('user_id', matchingId).order('created_at', { ascending: false });
    console.log(`\nWallet Transactions (${txs?.length || 0}):`);
    txs?.forEach(t => console.log(t));
  }
}

main();
