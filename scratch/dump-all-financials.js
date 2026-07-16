import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: payments } = await sb.from('payments').select('*');
  const { data: walletTx } = await sb.from('wallet_transactions').select('*');
  const { data: profiles } = await sb.from('profiles').select('id, full_name, email');

  const profileMap = new Map();
  if (profiles) {
    profiles.forEach(p => profileMap.set(p.id, p));
  }

  console.log('====================================');
  console.log('DUMPING ALL PAYMENTS IN DATABASE');
  console.log('====================================');
  if (payments) {
    payments.forEach((p, idx) => {
      const u = profileMap.get(p.user_id);
      console.log(`[Payment #${idx+1}] ID: ${p.id} | User: ${u ? u.full_name : 'Unknown ('+p.user_id+')'} | Amt: ₹${p.amount} | Status: ${p.status} | UTR/GatewayPayID: ${p.razorpay_payment_id} | OrderID/Screenshot: ${p.razorpay_order_id} | Created: ${p.created_at}`);
    });
  }

  console.log('\n====================================');
  console.log('DUMPING ALL WALLET TRANSACTIONS IN DATABASE');
  console.log('====================================');
  if (walletTx) {
    walletTx.forEach((w, idx) => {
      const u = profileMap.get(w.user_id);
      console.log(`[WalletTx #${idx+1}] ID: ${w.id} | User: ${u ? u.full_name : 'Unknown ('+w.user_id+')'} | Type: ${w.type} | Amt: ₹${w.amount} | Title: ${w.title} | Status: ${w.status} | Created: ${w.created_at} | PaymentID: ${w.payment_id} | OrderID: ${w.order_id}`);
    });
  }
}

main();
