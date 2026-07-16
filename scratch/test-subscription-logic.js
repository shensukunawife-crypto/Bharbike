/**
 * BHARBIKE SUBSCRIPTION LOGIC TEST SUITE
 * 
 * Business Rules being tested:
 * 1. ₹3450 = ₹1950 (weekly sub) + ₹1500 (one-time registration) — first-time users
 * 2. ₹1950 = weekly subscription only — returning users
 * 3. Only 1 plan exists: weekly_plan (7 days, ₹1950)
 * 4. After admin marks success → user gets active subscription for 7 days
 * 5. If user has active rental (bike still with them) → backdate from previous end date
 * 6. Dates must be exactly 7 days (start_date to end_date = 6 days gap = 7 inclusive days)
 */

import supabase from '../src/utils/supabaseClient.js';

// ─── Colours ──────────────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(GREEN(`  ✅ PASS`) + ` — ${label}`);
    if (detail) console.log(`       ${detail}`);
    passed++;
    results.push({ label, pass: true });
  } else {
    console.log(RED(`  ❌ FAIL`) + ` — ${label}`);
    if (detail) console.log(RED(`       ${detail}`));
    failed++;
    results.push({ label, pass: false, detail });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysBetween(dateA, dateB) {
  const msA = new Date(dateA).getTime();
  const msB = new Date(dateB).getTime();
  return Math.round(Math.abs(msB - msA) / (1000 * 60 * 60 * 24));
}

async function getActiveSub(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function countActiveSubs(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data || []).length;
}

async function cleanupUser(userId) {
  await supabase.from('user_subscriptions').delete().eq('user_id', userId);
  await supabase.from('payments').delete().eq('user_id', userId);
  await supabase.from('rentals').delete().eq('user_id', userId);
}

// ─── TEST RUNNER ──────────────────────────────────────────────────────────────
async function runTests() {
  console.log(BOLD(CYAN('\n=======================================================')));
  console.log(BOLD(CYAN(' BHARBIKE SUBSCRIPTION LOGIC — FULL TEST SUITE')));
  console.log(BOLD(CYAN('=======================================================')));

  // ── Get a real user to test with ──────────────────────────────────────────
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .limit(3);

  if (!users || users.length === 0) {
    console.log(RED('\nNo users found in DB. Cannot run tests.'));
    process.exit(1);
  }

  const testUser = users[0];
  console.log(`\n${YELLOW('Test User:')} ${testUser.full_name || testUser.phone} (${testUser.id})\n`);

  // ── Verify Plan Exists ────────────────────────────────────────────────────
  console.log(BOLD('\n📋 PRE-CHECK: Subscription Plans in Database'));
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true);

  console.log(`  Found ${(plans || []).length} active plan(s):`);
  (plans || []).forEach(p => {
    console.log(`  → ${p.name} | ₹${p.price} | ${p.duration_days} days | ID: ${p.id}`);
  });

  assert(
    'Exactly 1 active plan exists (weekly)',
    plans && plans.length === 1,
    plans ? `Plans: ${plans.map(p=>p.name).join(', ')}` : 'No plans found'
  );

  const weeklyPlan = plans?.[0];
  assert(
    'Plan price is ₹1950',
    weeklyPlan?.price === 1950,
    `Actual price: ₹${weeklyPlan?.price}`
  );
  assert(
    'Plan duration is 7 days',
    weeklyPlan?.duration_days === 7,
    `Actual duration: ${weeklyPlan?.duration_days} days`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: First-time user pays ₹3450 (subscription + registration fee)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 1: First-time user pays ₹3450 (₹1950 sub + ₹1500 reg fee)'));
  await cleanupUser(testUser.id);

  const { createSubscription } = await import('../src/services/subscriptionService.js');
  
  // Simulate: admin approves ₹3450 payment, which triggers createSubscription
  // The plan should be fetched from DB (weekly_plan) regardless of amount paid
  let sub1;
  try {
    sub1 = await createSubscription(testUser.id, 'weekly_plan', null, 3450);
    console.log(`  Created sub: status=${sub1?.status}, plan_id=${sub1?.plan_id}`);
    console.log(`  start_date: ${sub1?.start_date}`);
    console.log(`  end_date:   ${sub1?.end_date}`);
  } catch (e) {
    console.log(RED(`  createSubscription threw: ${e.message}`));
  }

  // NOTE: plan_id stored in user_subscriptions is the UUID of the plan (e.g. 03780beb-...)
  // NOT the string "weekly_plan". We get the correct UUID from the plans query above.
  const expectedPlanUUID = weeklyPlan?.id;
  console.log(`  Expected plan UUID: ${expectedPlanUUID}`);

  assert(
    'TEST 1: Subscription created successfully',
    !!sub1,
    sub1 ? `ID: ${sub1.id}` : 'sub1 is null'
  );
  assert(
    'TEST 1: Status is active',
    sub1?.status === 'active',
    `Actual: ${sub1?.status}`
  );
  assert(
    'TEST 1: Plan ID matches the weekly_plan UUID in DB',
    sub1?.plan_id === expectedPlanUUID,
    `Actual plan_id: ${sub1?.plan_id}\nExpected:        ${expectedPlanUUID}`
  );
  const days1 = daysBetween(sub1?.start_date, sub1?.end_date);
  assert(
    'TEST 1: Duration is exactly 6 days gap (7 inclusive days)',
    days1 === 6,
    `Actual gap: ${days1} days (end - start). 6 gap = 7 inclusive.`
  );
  assert(
    'TEST 1: end_date is in the future',
    new Date(sub1?.end_date) > new Date(),
    `end_date: ${sub1?.end_date}`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Returning user pays ₹1950 (subscription only)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 2: Returning user pays ₹1950 (subscription only, no reg fee)'));
  await cleanupUser(testUser.id);

  let sub2;
  try {
    sub2 = await createSubscription(testUser.id, 'weekly_plan', null, 1950);
    console.log(`  Created sub: status=${sub2?.status}, plan_id=${sub2?.plan_id}`);
  } catch (e) {
    console.log(RED(`  createSubscription threw: ${e.message}`));
  }

  assert('TEST 2: Subscription created', !!sub2);
  assert('TEST 2: Status is active', sub2?.status === 'active', `Actual: ${sub2?.status}`);
  assert('TEST 2: Plan ID matches weekly_plan UUID', sub2?.plan_id === expectedPlanUUID, `Actual: ${sub2?.plan_id}\nExpected: ${expectedPlanUUID}`);
  const days2 = daysBetween(sub2?.start_date, sub2?.end_date);
  assert('TEST 2: Duration is 6-day gap (7 inclusive)', days2 === 6, `Gap: ${days2} days`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: User renews — old sub must expire, new one created (no duplicates)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 3: Renewal — only 1 active sub after second payment'));
  // sub2 is still there (active). Now renew.
  let sub3;
  try {
    sub3 = await createSubscription(testUser.id, 'weekly_plan', null, 1950);
  } catch (e) {
    console.log(RED(`  createSubscription threw: ${e.message}`));
  }

  const activeCount3 = await countActiveSubs(testUser.id);
  assert(
    'TEST 3: Only 1 active subscription after renewal (no duplicates)',
    activeCount3 === 1,
    `Active subs found: ${activeCount3}`
  );
  assert('TEST 3: New sub is active', sub3?.status === 'active', `Actual: ${sub3?.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Brain heals a user who has NO subscription after payment
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 4: Brain heals missing subscription (simulated failure)'));
  await cleanupUser(testUser.id);

  // Simulate: payment went through but createSubscription crashed → no sub row
  // Brain should detect and fix this
  const { verifyAndHealSubscription } = await import('../src/services/subscriptionBrain.js');
  
  console.log('  Simulating: payment approved, but no subscription created...');
  console.log('  Running Brain (skipping 3s wait for test)...');
  
  // Directly call brain (it will wait 3s internally — we accept that in test)
  await verifyAndHealSubscription(testUser.id, 1950);

  const healedSub = await getActiveSub(testUser.id);
  assert(
    'TEST 4: Brain created active subscription',
    !!healedSub,
    healedSub ? `Healed sub end_date: ${healedSub.end_date}` : 'No active sub found after heal'
  );
  assert(
    'TEST 4: Healed sub plan_id matches weekly_plan UUID',
    healedSub?.plan_id === expectedPlanUUID,
    `Actual plan_id: ${healedSub?.plan_id}\nExpected: ${expectedPlanUUID}`
  );
  const healedDays = healedSub ? daysBetween(healedSub.start_date, healedSub.end_date) : 0;
  assert(
    'TEST 4: Healed duration is 6-day gap (7 inclusive)',
    healedDays === 6,
    `Gap: ${healedDays} days`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Brain heals ₹3450 payment correctly (not confused by reg fee)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 5: Brain handles ₹3450 (first-time payment with reg fee)'));
  await cleanupUser(testUser.id);

  console.log('  Running Brain with ₹3450 payment amount...');
  await verifyAndHealSubscription(testUser.id, 3450);

  const healedSub5 = await getActiveSub(testUser.id);
  assert(
    'TEST 5: Brain healed correctly for ₹3450',
    !!healedSub5,
    healedSub5 ? `end_date: ${healedSub5.end_date}` : 'No active sub found'
  );
  assert(
    'TEST 5: Plan UUID is weekly_plan (not confused by ₹3450)',
    healedSub5?.plan_id === expectedPlanUUID,
    `Actual plan_id: ${healedSub5?.plan_id}\nExpected: ${expectedPlanUUID}`
  );
  const days5 = healedSub5 ? daysBetween(healedSub5.start_date, healedSub5.end_date) : 0;
  assert(
    'TEST 5: Duration is correct 7 days (6-day gap)',
    days5 === 6,
    `Gap: ${days5} days`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Backdating — user has active rental, subscription should start from previous end
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 6: Backdating — user kept bike, new sub starts from old sub end'));
  await cleanupUser(testUser.id);

  // Setup: create an expired subscription (ended 2 days ago)
  const pastEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const pastStart = new Date(pastEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
  await supabase.from('user_subscriptions').insert({
    user_id: testUser.id,
    plan_id: 'weekly_plan',
    status: 'expired',
    start_date: pastStart.toISOString(),
    end_date: pastEnd.toISOString(),
    auto_renew: false,
    created_at: pastStart.toISOString(),
    updated_at: pastEnd.toISOString()
  });

  // Setup: create an active rental (bike still with user, no end_time)
  const { data: bikes } = await supabase.from('bikes').select('id').limit(1);
  let rentalId = null;
  if (bikes && bikes.length > 0) {
    const { data: rental } = await supabase.from('rentals').insert({
      user_id: testUser.id,
      bike_id: bikes[0].id,
      status: 'active',
      start_time: pastStart.toISOString(),
      end_time: null,
      price: 0
    }).select('id').single();
    rentalId = rental?.id;
    console.log(`  Active rental created: ${rentalId}`);
  } else {
    console.log(YELLOW('  ⚠ No bikes found — skipping rental setup. Backdating test may not work.'));
  }

  // Now renew — should backdate to pastEnd
  let sub6;
  try {
    sub6 = await createSubscription(testUser.id, 'weekly_plan', null, 1950);
    console.log(`  New sub start_date: ${sub6?.start_date}`);
    console.log(`  Expected start:     ${pastEnd.toISOString()}`);
  } catch (e) {
    console.log(RED(`  createSubscription threw: ${e.message}`));
  }

  if (rentalId) {
    const startDiff = Math.abs(
      new Date(sub6?.start_date).getTime() - pastEnd.getTime()
    );
    assert(
      'TEST 6: New sub start_date matches previous end_date (backdated)',
      startDiff < 5000, // within 5 seconds (same timestamp)
      `start_date: ${sub6?.start_date}\nexpected: ${pastEnd.toISOString()}\ndiff: ${startDiff}ms`
    );
    assert(
      'TEST 6: Backdated sub is still 7 days long',
      daysBetween(sub6?.start_date, sub6?.end_date) === 6,
      `Gap: ${daysBetween(sub6?.start_date, sub6?.end_date)} days`
    );
    // Cleanup rental
    await supabase.from('rentals').delete().eq('id', rentalId);
  } else {
    console.log(YELLOW('  ⚠ Skipped backdating assertion (no bike available for rental)'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Brain log check — verify actions are being logged to DB
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(BOLD('\n🧪 TEST 7: Brain activity is logged to brain_activity_logs table'));
  const { data: logs } = await supabase
    .from('brain_activity_logs')
    .select('*')
    .eq('user_id', testUser.id)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log(`  Found ${(logs || []).length} log entries for this user:`);
  (logs || []).slice(0, 5).forEach(l => {
    console.log(`  → [${l.action}] ${l.reason || '-'} | plan: ${l.plan_id || '-'}`);
  });

  assert(
    'TEST 7: Brain logs exist in database',
    logs && logs.length > 0,
    `Logs found: ${(logs || []).length}`
  );
  assert(
    'TEST 7: No log uses wrong plan ID "weekly" (old bug)',
    !(logs || []).some(l => l.plan_id === 'weekly'),
    `Found "weekly" plan_id in logs: ${(logs||[]).filter(l=>l.plan_id==='weekly').length} entries`
  );

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  await cleanupUser(testUser.id);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(BOLD(CYAN('\n=======================================================')));
  console.log(BOLD(CYAN(' RESULTS')));
  console.log(BOLD(CYAN('=======================================================')));
  console.log(GREEN(`  ✅ Passed: ${passed}`));
  console.log(RED(`  ❌ Failed: ${failed}`));
  console.log(`  Total: ${passed + failed}`);

  if (failed === 0) {
    console.log(BOLD(GREEN('\n🎉 ALL TESTS PASSED — Logic is correct!')));
  } else {
    console.log(BOLD(RED(`\n⚠️  ${failed} test(s) FAILED — check issues above`)));
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(RED(`  • ${r.label}`));
      if (r.detail) console.log(`    ${r.detail}`);
    });
  }
  console.log('');
}

runTests().catch(console.error);
