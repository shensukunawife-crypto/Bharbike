import supabase from '../src/utils/supabaseClient.js';
import { createSubscription } from '../src/services/subscriptionService.js';
import { verifyAndHealSubscription } from '../src/services/subscriptionBrain.js';

// ── helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function check(label, condition, extra = '') {
  const icon = condition ? '✅' : '❌';
  console.log(`    ${icon} ${label}${extra ? ' — ' + extra : ''}`);
  condition ? passed++ : failed++;
  return condition;
}

async function getAllSubs(userId) {
  const { data } = await supabase
    .from('user_subscriptions').select('*')
    .eq('user_id', userId).order('created_at', { ascending: true });
  return data || [];
}

async function getActiveSub(userId) {
  const { data } = await supabase
    .from('user_subscriptions').select('*')
    .eq('user_id', userId).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function wipeUserSubs(userId) {
  await supabase.from('user_subscriptions').delete().eq('user_id', userId);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

// ── main ─────────────────────────────────────────────────────────────────────
async function runStressTest() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     SUBSCRIPTION FULL STRESS TEST  (20 runs)         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Use a safe test user (Nabirul Shekh)
  const { data: users } = await supabase.rpc('exec_sql', {
    sql_query: "SELECT id FROM users WHERE phone = '+919152171732'"
  });
  const userId = users[0].id;
  const PLAN_ID = 'weekly';
  const AMOUNT  = 1950;

  // ── BLOCK 1: createSubscription — 10 consecutive renewals ─────────────────
  console.log('━━━ BLOCK 1: 10 consecutive renewals via createSubscription ━━━\n');
  await wipeUserSubs(userId);

  for (let i = 1; i <= 10; i++) {
    console.log(`  Run #${i}:`);
    await createSubscription(userId, PLAN_ID, `fake-payment-${i}`, AMOUNT);

    const active = await getActiveSub(userId);
    const allSubs = await getAllSubs(userId);

    // Check 1: exactly one active subscription exists
    const activeCount = allSubs.filter(s => s.status === 'active').length;
    check('Exactly 1 active subscription', activeCount === 1, `found ${activeCount}`);

    // Check 2: previous subscriptions are marked expired (not deleted)
    if (i > 1) {
      const expiredCount = allSubs.filter(s => s.status === 'expired').length;
      check(`History preserved — ${i - 1} expired record(s)`, expiredCount === i - 1, `found ${expiredCount}`);
    }

    // Check 3: active sub status is exactly 'active'
    check('Status is active', active?.status === 'active');

    // Check 4: end date is in the future
    check('End date is in the future', active && new Date(active.end_date) > new Date());

    // Check 5: duration is 6 days (7 days inclusive)
    const dur = daysBetween(active?.start_date, active?.end_date);
    check('Duration is 6 days (7 inclusive)', dur >= 5 && dur <= 7, `got ${dur} days`);

    // Check 6: total rows = i (no deletes happening)
    check(`DB has ${i} total row(s)`, allSubs.length === i, `found ${allSubs.length}`);

    console.log();
  }

  // ── BLOCK 2: Brain heal — 10 different broken states ──────────────────────
  console.log('━━━ BLOCK 2: Brain heals 10 different broken states ━━━\n');
  
  const brokenStates = [
    { label: 'status=cancelled',  patch: { status: 'cancelled' } },
    { label: 'status=expired',    patch: { status: 'expired' } },
    { label: 'end_date in past',  patch: { status: 'active', start_date: '2026-07-01T00:00:00Z', end_date: '2026-07-07T00:00:00Z' } },
    { label: 'status=cancelled again', patch: { status: 'cancelled' } },
    { label: 'end_date = now',    patch: { status: 'active', end_date: new Date().toISOString() } },
    { label: 'status=expired again',   patch: { status: 'expired' } },
    { label: 'start=end (same day)',   patch: { status: 'active', start_date: new Date().toISOString(), end_date: new Date().toISOString() } },
    { label: 'status=cancelled 3rd',  patch: { status: 'cancelled' } },
    { label: 'end_date 1 day ago',    patch: { status: 'active', end_date: new Date(Date.now() - 86400000).toISOString() } },
    { label: 'completely deleted',    patch: null },
  ];

  for (let i = 0; i < brokenStates.length; i++) {
    const { label, patch } = brokenStates[i];
    console.log(`  Run #${i + 1} [${label}]:`);

    // Set the broken state
    const curActive = await getActiveSub(userId);
    if (patch === null) {
      // Delete all subscriptions
      await wipeUserSubs(userId);
    } else if (curActive) {
      await supabase.from('user_subscriptions').update(patch).eq('id', curActive.id);
    }

    // Fire the brain
    await verifyAndHealSubscription(userId, AMOUNT);

    const healed = await getActiveSub(userId);
    check('Brain healed — status is active', healed?.status === 'active');
    check('Brain healed — end date in future', healed && new Date(healed.end_date) > new Date());
    const healedDur = daysBetween(healed?.start_date, healed?.end_date);
    check('Brain healed — duration 5-7 days', healedDur >= 5 && healedDur <= 7, `got ${healedDur} days`);
    console.log();
  }

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed}/${total} checks passed                          ║`);
  if (failed === 0) {
    console.log('║  🎉 ALL CHECKS PASSED — System is bulletproof!        ║');
  } else {
    console.log(`║  ⚠️  ${failed} check(s) FAILED — needs attention          ║`);
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Restore Nabirul cleanly
  const start = new Date();
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  await wipeUserSubs(userId);
  await supabase.from('user_subscriptions').insert({
    user_id: userId, status: 'active', plan_id: PLAN_ID,
    start_date: start.toISOString(), end_date: end.toISOString(),
    auto_renew: false, created_at: new Date().toISOString()
  });
  console.log('✅ Nabirul restored cleanly (active until ' + end.toDateString() + ')');
}

runStressTest().catch(console.error);
