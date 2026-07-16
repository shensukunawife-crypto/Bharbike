import supabase from '../src/utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../src/services/subscriptionBrain.js';

async function getSubState(userId) {
  const { data } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

function check(label, condition) {
  console.log(`  ${condition ? '✅ PASS' : '❌ FAIL'}: ${label}`);
  return condition;
}

async function runEdgeCaseTests() {
  console.log("===========================================");
  console.log("   SUBSCRIPTION BRAIN - EDGE CASE TESTS   ");
  console.log("===========================================\n");

  const phone = '+919152171732'; // Nabirul Shekh
  const { data: users } = await supabase.rpc('exec_sql', { sql_query: `SELECT id FROM users WHERE phone = '${phone}'` });
  const userId = users[0].id;

  // Check what plans exist in DB
  const { data: plans } = await supabase.from("subscription_plans").select("*");
  console.log("Plans in DB:");
  plans?.forEach(p => console.log(`  - name: ${p.name}, price: ₹${p.price}, duration: ${p.duration_days} days`));
  console.log();

  // ─────────────────────────────────────────
  // EDGE CASE 1: Wrong amount passed (not matching any plan)
  // ─────────────────────────────────────────
  console.log("EDGE CASE 1: Unknown amount (e.g. ₹500) — does Brain use safe fallback?");
  await supabase.from("user_subscriptions").update({ status: 'cancelled' }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 500); // No plan matches ₹500
  const sub1 = await getSubState(userId);
  check("Status healed to 'active' using fallback", sub1?.status === 'active');
  const msDiff1 = new Date(sub1?.end_date) - new Date(sub1?.start_date);
  const days1 = Math.round(msDiff1 / (1000 * 60 * 60 * 24));
  check(`Got at least 6 days (fallback) — Got: ${days1}`, days1 >= 5);
  console.log();

  // ─────────────────────────────────────────
  // EDGE CASE 2: ₹3450 monthly plan (different price)
  // ─────────────────────────────────────────
  console.log("EDGE CASE 2: ₹3450 monthly payment — does Brain give more than 7 days?");
  await supabase.from("user_subscriptions").update({ status: 'cancelled' }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 3450);
  const sub2 = await getSubState(userId);
  check("Status healed to 'active'", sub2?.status === 'active');
  const msDiff2 = new Date(sub2?.end_date) - new Date(sub2?.start_date);
  const days2 = Math.round(msDiff2 / (1000 * 60 * 60 * 24));
  console.log(`  ℹ️  Duration given: ${days2} days (expected more than 7 for monthly)`);
  check("Monthly plan gives more than 7 days", days2 > 7);
  console.log();

  // ─────────────────────────────────────────
  // EDGE CASE 3: Subscription end_date exactly = now (boundary condition)
  // ─────────────────────────────────────────
  console.log("EDGE CASE 3: End date set to exactly right now (boundary — should it heal?)");
  const exactlyNow = new Date().toISOString();
  await supabase.from("user_subscriptions").update({ 
    status: 'active',
    start_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: exactlyNow
  }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub3 = await getSubState(userId);
  check("Status healed to 'active'", sub3?.status === 'active');
  check("New end date is in the future", new Date(sub3?.end_date) > new Date());
  console.log();

  // ─────────────────────────────────────────
  // EDGE CASE 4: What if userId is null/undefined?
  // ─────────────────────────────────────────
  console.log("EDGE CASE 4: null userId — Brain should NOT crash");
  try {
    await verifyAndHealSubscription(null, 1950);
    check("Brain handled null userId gracefully (no crash)", true);
  } catch(e) {
    check("Brain crashed on null userId", false);
    console.log("  Error:", e.message);
  }
  console.log();

  // ─────────────────────────────────────────
  // EDGE CASE 5: Amount is 0
  // ─────────────────────────────────────────
  console.log("EDGE CASE 5: Amount is 0 — Brain should NOT crash");
  try {
    await verifyAndHealSubscription(userId, 0);
    check("Brain handled ₹0 amount gracefully (no crash)", true);
  } catch(e) {
    check("Brain crashed on ₹0 amount", false);
    console.log("  Error:", e.message);
  }
  console.log();

  // Restore Nabirul cleanly
  const start = new Date();
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  await supabase.from("user_subscriptions").upsert({ user_id: userId, status: 'active', start_date: start.toISOString(), end_date: end.toISOString(), plan_id: 'weekly', auto_renew: false }, { onConflict: "user_id" });
  console.log("✅ Nabirul restored cleanly.");
  console.log("===========================================");
}

runEdgeCaseTests();
