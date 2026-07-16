import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const [
    { data: walletTransactionsData },
    { data: billingData },
    { data: dbProfiles }
  ] = await Promise.all([
    sb.from("wallet_transactions").select("id, user_id, amount, type, title, status, created_at").eq("status", "completed").order("created_at", { ascending: true }),
    sb.from("subscription_billing").select("id, user_id, amount, status, created_at, payment_method"),
    sb.from("profiles").select("id, full_name")
  ]);

  const realUserIds = new Set(
    (dbProfiles || []).filter(u => {
      const name = (u.full_name || "").toLowerCase();
      return !name.includes("test");
    }).map(u => u.id)
  );

  const validBillings = (billingData || []).filter(b => {
    return b.status === "paid" && b.user_id && realUserIds.has(b.user_id);
  });

  const walletCreditsByUser = {};
  const walletDebitsByUser = {};
  (walletTransactionsData || []).forEach(t => {
    if (!t.user_id || !realUserIds.has(t.user_id)) return;
    const title = (t.title || "").toLowerCase();
    if (title.includes("promo") || title.includes("test")) return;

    const amt = Number(t.amount || 0);
    if (t.type === "credit") {
      walletCreditsByUser[t.user_id] = (walletCreditsByUser[t.user_id] || 0) + amt;
    } else if (t.type === "debit") {
      walletDebitsByUser[t.user_id] = (walletDebitsByUser[t.user_id] || 0) + amt;
    }
  });

  const allRealCredits = [
    ...validBillings.map(b => ({
      id: b.id,
      amount: Number(b.amount || 0),
      created_at: b.created_at,
      title: "Subscription",
      user_id: b.user_id
    }))
  ];

  realUserIds.forEach(uid => {
    const cred = walletCreditsByUser[uid] || 0;
    const deb = walletDebitsByUser[uid] || 0;
    const net = cred - deb;
    if (net > 0) {
      allRealCredits.push({
        id: `WLT-UNSPENT-${uid}`,
        amount: net,
        created_at: new Date().toISOString(),
        title: "Wallet Deposit (Unspent)",
        user_id: uid
      });
    }
  });

  // Sort chronologically per user
  allRealCredits.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Find the first transaction of each user
  const firstCreditByUser = {};
  allRealCredits.forEach(t => {
    if (!firstCreditByUser[t.user_id]) {
      firstCreditByUser[t.user_id] = t.id;
    }
  });

  console.log('--- ADJUSTED TRANSACTIONS ---');
  let originalSum = 0;
  let adjustedSum = 0;

  allRealCredits.forEach(t => {
    const isFirst = firstCreditByUser[t.user_id] === t.id;
    const originalAmount = t.amount;
    let finalAmount = originalAmount;
    let label = t.title;

    if (isFirst) {
      label = "Registration Fee + Plan";
      // If the first transaction is less than 3000, we add the 1500 registration fee
      if (originalAmount < 3000) {
        finalAmount = originalAmount + 1500;
      }
    }

    const userName = (dbProfiles || []).find(p => p.id === t.user_id)?.full_name || 'Unknown';
    console.log(`- User: ${userName} | Type: ${label} | Original: ₹${originalAmount} | Adjusted: ₹${finalAmount} | Date: ${t.created_at}`);

    originalSum += originalAmount;
    adjustedSum += finalAmount;
  });

  console.log('\n--- COMPARISON ---');
  console.log('Original Sum:', originalSum);
  console.log('Adjusted Sum (including manual registration fees):', adjustedSum);
}

main();
