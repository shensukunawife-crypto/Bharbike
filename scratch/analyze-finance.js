import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: txs } = await sb.from('wallet_transactions').select('*');
  const { data: users } = await sb.from('users').select('id, full_name');
  
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = u.full_name;
  });

  let rawTotalCredits = 0;
  let promoCredits = 0;
  let testUserCredits = 0;
  let deletedUserCredits = 0;
  let validCredits = 0;

  console.log('--- INDIVIDUAL CREDITS IN DB ---');
  txs.forEach(t => {
    if (t.type === 'credit' && t.status === 'completed') {
      const amt = Number(t.amount || 0);
      rawTotalCredits += amt;

      const userName = userMap[t.user_id];
      const isPromo = (t.title || "").toLowerCase().includes("promo");
      const isTestUser = userName && userName.toLowerCase().includes("test");
      const isDeleted = !userName;

      let category = 'Valid';
      if (isPromo) {
        promoCredits += amt;
        category = 'Promo (Excluded)';
      } else if (isDeleted) {
        deletedUserCredits += amt;
        category = 'Deleted User (Excluded)';
      } else if (isTestUser) {
        testUserCredits += amt;
        category = 'Test User (Excluded)';
      } else {
        validCredits += amt;
      }

      console.log(`User: ${userName || 'DELETED ('+t.user_id+')'} | Title: "${t.title}" | Amount: ₹${amt} | Category: ${category}`);
    }
  });

  console.log('\n--- BREAKDOWN ---');
  console.log('Total Raw Credits in DB:', rawTotalCredits);
  console.log('Promo Credits (Promo code/gift):', promoCredits);
  console.log('Test User Credits (e.g. Adil Ansari Test):', testUserCredits);
  console.log('Deleted/Orphaned User Credits:', deletedUserCredits);
  console.log('Calculated Valid Revenue:', validCredits);
}

main();
