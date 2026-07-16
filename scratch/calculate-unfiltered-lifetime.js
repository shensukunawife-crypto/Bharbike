import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: payments } = await sb.from('payments').select('*').in('status', ['success', 'paid']);
  const { data: walletTx } = await sb.from('wallet_transactions').select('*').eq('type', 'credit').eq('status', 'completed');

  console.log('--- ALL COMPLETED WALLET CREDITS IN DB (UNFILTERED BY USER) ---');
  let walletSum = 0;
  for (const w of walletTx || []) {
    const title = (w.title || '').toLowerCase();
    const isPromo = title.includes('promo');
    const isTest = title.includes('test');
    if (!isPromo && !isTest) {
      console.log(`- Amt: ₹${w.amount} | Title: ${w.title} | UserID: ${w.user_id} | Date: ${w.created_at}`);
      walletSum += Number(w.amount || 0);
    }
  }

  console.log('\n--- ALL SUCCESSFUL PAYMENTS IN DB (UNFILTERED) ---');
  let paymentSum = 0;
  for (const p of payments || []) {
    if (p.amount) {
      console.log(`- Amt: ₹${p.amount} | UserID: ${p.user_id} | Date: ${p.created_at}`);
      paymentSum += Number(p.amount || 0);
    }
  }

  console.log('\n--- UNFILTERED TOTALS ---');
  console.log('Payment Sum:', paymentSum);
  console.log('Wallet Credit Sum:', walletSum);
  console.log('Total (no deduplication):', paymentSum + walletSum);
}

main();
