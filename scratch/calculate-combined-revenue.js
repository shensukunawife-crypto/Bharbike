import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: txs } = await sb.from('wallet_transactions').select('*').eq('type', 'credit').eq('status', 'completed');
  const { data: payments } = await sb.from('payments').select('*').in('status', ['success', 'paid']);
  const { data: profiles } = await sb.from('profiles').select('id, full_name');
  
  const profileUserIds = new Set(
    (profiles || []).filter(u => {
      const name = (u.full_name || "").toLowerCase();
      return !name.includes("test");
    }).map(u => u.id)
  );

  let totalRevenue = 0;
  console.log('--- REVENUE FROM WALLET TRANSACTIONS ---');
  (txs || []).forEach(t => {
    const p = profiles.find(x => x.id === t.user_id);
    const title = (t.title || "").toLowerCase();
    const isTestUser = p && p.full_name.toLowerCase().includes("test");
    const isPromo = title.includes("promo");

    if (p && !isTestUser && !isPromo) {
      console.log(`Wallet Credit | Rider: ${p.full_name} | Amount: ₹${t.amount} | Title: "${t.title}"`);
      totalRevenue += Number(t.amount || 0);
    }
  });

  console.log('\n--- REVENUE FROM DIRECT PAYMENTS ---');
  (payments || []).forEach(p => {
    const user = profiles.find(x => x.id === p.user_id);
    const isTestUser = user && user.full_name.toLowerCase().includes("test");
    const amt = Number(p.amount || 0);

    if (user && !isTestUser && amt > 0) {
      console.log(`Direct Payment | Rider: ${user.full_name} | Amount: ₹${amt} | Status: "${p.status}"`);
      totalRevenue += amt;
    }
  });

  console.log('\nTotal Combined Revenue:', totalRevenue);
}

main();
