import supabase from '../src/utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../src/services/subscriptionBrain.js';

// Helper to get current subscription state
async function getSubState(userId) {
  const { data } = await supabase.from("user_subscriptions").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

// Helper to print pass/fail
function check(label, condition) {
  console.log(`  ${condition ? '✅ PASS' : '❌ FAIL'}: ${label}`);
  return condition;
}

async function runTests() {
  console.log("===========================================");
  console.log("   SUBSCRIPTION BRAIN - FULL TEST SUITE   ");
  console.log("===========================================\n");

  // Use Nabirul Shekh as test subject (we fixed him earlier so it's safe)
  const phone = '+919152171732';
  const { data: users } = await supabase.rpc('exec_sql', { sql_query: `SELECT id FROM users WHERE phone = '${phone}'` });
  const userId = users[0].id;
  console.log(`Test Subject: Nabirul Shekh (${userId})\n`);

  let allPassed = true;

  // ─────────────────────────────────────────
  // TEST 1: Status is 'cancelled'
  // ─────────────────────────────────────────
  console.log("TEST 1: Brain detects 'cancelled' status and heals it");
  await supabase.from("user_subscriptions").update({ status: 'cancelled' }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub1 = await getSubState(userId);
  const pass1a = check("Status is now 'active'", sub1?.status === 'active');
  const pass1b = check("End date is in the future", sub1 && new Date(sub1.end_date) > new Date());
  const msDiff1 = new Date(sub1.end_date) - new Date(sub1.start_date);
  const days1 = Math.round(msDiff1 / (1000 * 60 * 60 * 24));
  const pass1c = check(`Duration is 6 days (inclusive 7-day plan) — Got: ${days1} days`, days1 >= 5 && days1 <= 7);
  allPassed = allPassed && pass1a && pass1b && pass1c;
  console.log();

  // ─────────────────────────────────────────
  // TEST 2: Status is 'expired'
  // ─────────────────────────────────────────
  console.log("TEST 2: Brain detects 'expired' status and heals it");
  await supabase.from("user_subscriptions").update({ status: 'expired' }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub2 = await getSubState(userId);
  const pass2a = check("Status is now 'active'", sub2?.status === 'active');
  const pass2b = check("End date is in the future", sub2 && new Date(sub2.end_date) > new Date());
  allPassed = allPassed && pass2a && pass2b;
  console.log();

  // ─────────────────────────────────────────
  // TEST 3: End date in the past (wrong dates)
  // ─────────────────────────────────────────
  console.log("TEST 3: Brain detects end_date in the past and heals it");
  await supabase.from("user_subscriptions").update({ 
    status: 'active',
    start_date: new Date('2026-07-01').toISOString(),
    end_date: new Date('2026-07-07').toISOString()   // already passed!
  }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub3 = await getSubState(userId);
  const pass3a = check("Status is now 'active'", sub3?.status === 'active');
  const pass3b = check("End date is NOW in the future", sub3 && new Date(sub3.end_date) > new Date());
  allPassed = allPassed && pass3a && pass3b;
  console.log();

  // ─────────────────────────────────────────
  // TEST 4: Subscription is MISSING entirely
  // ─────────────────────────────────────────
  console.log("TEST 4: Brain detects MISSING subscription and creates it");
  await supabase.from("user_subscriptions").delete().eq("user_id", userId);
  const subBefore4 = await getSubState(userId);
  check("Subscription deleted (pre-condition)", subBefore4 === null);
  await verifyAndHealSubscription(userId, 1950);
  const sub4 = await getSubState(userId);
  const pass4a = check("Subscription now exists", sub4 !== null);
  const pass4b = check("Status is 'active'", sub4?.status === 'active');
  const pass4c = check("End date is in the future", sub4 && new Date(sub4.end_date) > new Date());
  allPassed = allPassed && pass4a && pass4b && pass4c;
  console.log();

  // ─────────────────────────────────────────
  // TEST 5: Healthy subscription is NOT touched
  // ─────────────────────────────────────────
  console.log("TEST 5: Brain does NOT touch a perfectly healthy subscription");
  const healthyEnd = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const healthyStart = new Date().toISOString();
  await supabase.from("user_subscriptions").update({ 
    status: 'active',
    start_date: healthyStart,
    end_date: healthyEnd
  }).eq("user_id", userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub5 = await getSubState(userId);
  const pass5a = check("Status is still 'active'", sub5?.status === 'active');
  const pass5b = check("End date unchanged", Math.abs(new Date(sub5.end_date) - new Date(healthyEnd)) < 5000); // within 5 seconds
  allPassed = allPassed && pass5a && pass5b;
  console.log();

  // ─────────────────────────────────────────
  // FINAL RESULT
  // ─────────────────────────────────────────
  console.log("===========================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED! Brain is working perfectly.");
  } else {
    console.log("⚠️  SOME TESTS FAILED. Check above for details.");
  }
  console.log("===========================================\n");
  
  // Restore Nabirul's subscription to correct clean state
  const finalStart = new Date();
  const finalEnd = new Date(finalStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  await supabase.from("user_subscriptions").upsert({ user_id: userId, status: 'active', start_date: finalStart.toISOString(), end_date: finalEnd.toISOString(), plan_id: 'weekly', auto_renew: false }, { onConflict: "user_id" });
  console.log("✅ Nabirul's subscription restored to correct active state.");
}

runTests();
