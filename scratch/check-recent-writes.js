import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // last 2 hours
  console.log('Searching for database writes after:', cutoff);

  const [
    { data: payments },
    { data: orders },
    { data: walletTx },
    { data: billing }
  ] = await Promise.all([
    sb.from('payments').select('*').gte('created_at', cutoff),
    sb.from('orders').select('*').gte('created_at', cutoff),
    sb.from('wallet_transactions').select('*').gte('created_at', cutoff),
    sb.from('subscription_billing').select('*').gte('created_at', cutoff)
  ]);

  console.log('Payments written:', payments?.length);
  if (payments && payments.length > 0) console.log(payments);

  console.log('Orders written:', orders?.length);
  if (orders && orders.length > 0) console.log(orders);

  console.log('Wallet Transactions written:', walletTx?.length);
  if (walletTx && walletTx.length > 0) console.log(walletTx);

  console.log('Subscription Billings written:', billing?.length);
  if (billing && billing.length > 0) console.log(billing);
}

main();
