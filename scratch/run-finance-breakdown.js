import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

function safeData(d) {
  return d || [];
}

async function main() {
  const [
    { data: walletCredits, error: walletError },
    { data: paymentsData, error: paymentsError },
    { data: allProfiles, error: profilesError }
  ] = await Promise.all([
    sb.from("wallet_transactions").select("id, user_id, amount, type, title, description, status, created_at, payment_id, order_id").eq("type", "credit").eq("status", "completed").order("created_at", { ascending: true }),
    sb.from("payments").select("id, user_id, amount, status, order_id, created_at"),
    sb.from("profiles").select("id, full_name")
  ]);

  console.log('--- DB STATS ---');
  console.log('Wallet credit rows:', walletCredits?.length);
  console.log('Payments rows:', paymentsData?.length);
  console.log('Profiles rows:', allProfiles?.length);

  // Build set of real (non-test) user IDs from profiles table
  const realUserIds = new Set(
    (allProfiles || []).filter(u => {
      const name = (u.full_name || "").toLowerCase();
      return !name.includes("test");
    }).map(u => u.id)
  );

  console.log('\n--- REAL USERS ---');
  console.log('Real User Count:', realUserIds.size);
  (allProfiles || []).forEach(p => {
    if (realUserIds.has(p.id)) {
      console.log(`- ${p.full_name} (${p.id})`);
    }
  });

  // 1. Direct Payments (success or paid)
  const validPayments = safeData(paymentsData).filter(p => {
    const status = String(p.status || "").toLowerCase();
    const isPaid = status === "success" || status === "paid";
    const isRealUser = p.user_id && realUserIds.has(p.user_id);
    return isPaid && isRealUser;
  });

  console.log('\n--- VALID PAYMENTS (SUCCESS/PAID & REAL USER) ---');
  validPayments.forEach(p => {
    const userName = (allProfiles || []).find(prof => prof.id === p.user_id)?.full_name;
    console.log(`- User: ${userName} | Amt: ₹${p.amount} | Status: ${p.status} | ID: ${p.id} | Order UUID: ${p.order_id}`);
  });

  const successfulPaymentIds = new Set(validPayments.map(p => p.id));
  const successfulPaymentOrderIds = new Set(validPayments.map(p => p.order_id).filter(Boolean));

  // 2. Wallet Credits (completed credits, excluding double-counted ones)
  const validWalletCredits = safeData(walletCredits).filter(t => {
    const title = (t.title || "").toLowerCase();
    const isPromo = title.includes("promo");
    const isTest = title.includes("test");
    const isDouble = (t.payment_id && successfulPaymentIds.has(t.payment_id)) || 
                     (t.order_id && (successfulPaymentOrderIds.has(t.order_id) || successfulPaymentIds.has(t.order_id)));
    const isRealUser = t.user_id && realUserIds.has(t.user_id);
    
    return !isPromo && !isTest && !isDouble && isRealUser;
  });

  console.log('\n--- VALID WALLET CREDITS (REAL USER, NO PROMO/TEST/DOUBLE) ---');
  validWalletCredits.forEach(t => {
    const userName = (allProfiles || []).find(prof => prof.id === t.user_id)?.full_name;
    console.log(`- User: ${userName} | Amt: ₹${t.amount} | Title: ${t.title} | ID: ${t.id} | Payment ID: ${t.payment_id} | Order ID: ${t.order_id}`);
  });

  const paymentSum = validPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const walletSum = validWalletCredits.reduce((s, t) => s + Number(t.amount || 0), 0);
  const total = paymentSum + walletSum;

  console.log('\n--- SUMS ---');
  console.log('Payment Sum:', paymentSum);
  console.log('Wallet Sum:', walletSum);
  console.log('Total Earnings:', total);
}

main();
