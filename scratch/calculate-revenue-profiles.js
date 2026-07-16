import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: walletCredits } = await sb.from("wallet_transactions").select("*").eq("type", "credit").eq("status", "completed");
  const { data: allProfiles } = await sb.from("profiles").select("id, full_name");
  
  const profileUserIds = new Set(
    (allProfiles || []).filter(u => {
      const name = (u.full_name || "").toLowerCase();
      return !name.includes("test");
    }).map(u => u.id)
  );

  const isRealPayment = (t) => {
    const title = (t.title || "").toLowerCase();
    return !title.includes("promo")
      && !title.includes("test")
      && profileUserIds.has(t.user_id);
  };

  const firstCreditByUser = {};
  const realCredits = (walletCredits || []).filter(isRealPayment);
  realCredits.forEach(t => {
    if (!firstCreditByUser[t.user_id]) firstCreditByUser[t.user_id] = t;
  });

  const totalRevenue = realCredits.reduce((s, t) => s + Number(t.amount || 0), 0);
  console.log('--- REVENUE CALCULATION USING PROFILES TABLE ---');
  console.log('Total Valid Credits:', realCredits.length);
  realCredits.forEach(t => {
    const profile = allProfiles.find(p => p.id === t.user_id);
    console.log(`Rider: ${profile?.full_name} | Title: "${t.title}" | Amount: ₹${t.amount}`);
  });
  console.log('Total Revenue:', totalRevenue);
}

main();
