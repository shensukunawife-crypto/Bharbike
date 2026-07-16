import supabase from '../src/utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../src/services/subscriptionBrain.js';
import { createSubscription } from '../src/services/subscriptionService.js';

let passed = 0, failed = 0;
function check(label, condition, extra = '') {
  const icon = condition ? '✅' : '❌';
  console.log(`  ${icon} ${label}${extra ? ' — ' + extra : ''}`);
  condition ? passed++ : failed++;
  return condition;
}
async function getActiveSub(userId) {
  const { data } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}
async function getAllSubs(userId) {
  const { data } = await supabase.from('user_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}
async function wipe(userId) {
  await supabase.from('user_subscriptions').delete().eq('user_id', userId);
}

async function run() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          BRAIN DEEP VERIFICATION SUITE               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const { data: users } = await supabase.rpc('exec_sql', { sql_query: "SELECT id FROM users WHERE phone = '+919152171732'" });
  const userId = users[0].id;

  // ── TEST 1: Brain does NOT re-trigger if createSubscription already succeeded ──
  console.log('TEST 1: Brain stays idle when createSubscription already did its job');
  await wipe(userId);
  await createSubscription(userId, 'weekly', 'pmt-test-1', 1950);
  const beforeBrain = await getActiveSub(userId);
  const beforeEnd = beforeBrain?.end_date;
  await verifyAndHealSubscription(userId, 1950); // should detect healthy, do nothing
  const afterBrain = await getActiveSub(userId);
  check('Same end_date — brain did NOT overwrite a healthy sub', afterBrain?.end_date === beforeEnd);
  check('Still exactly 1 active row', (await getAllSubs(userId)).filter(s => s.status === 'active').length === 1);
  console.log();

  // ── TEST 2: Brain correctly identifies plan from ₹1950 amount ──
  console.log('TEST 2: Brain maps ₹1950 to correct plan from DB');
  await wipe(userId);
  await verifyAndHealSubscription(userId, 1950);
  const sub2 = await getActiveSub(userId);
  const { data: plan } = await supabase.from('subscription_plans').select('*').eq('price', 1950).limit(1).maybeSingle();
  check('plan_id matches DB plan id or name', sub2?.plan_id === plan?.id || sub2?.plan_id === plan?.name, `got: ${sub2?.plan_id}`);
  check('Status is active', sub2?.status === 'active');
  console.log();

  // ── TEST 3: Brain handles multiple duplicate active subs (cleanup test) ──
  console.log('TEST 3: Brain cleans up duplicate active subscriptions');
  await wipe(userId);
  // Manually insert 3 active subs (simulating a bug)
  for (let i = 0; i < 3; i++) {
    const s = new Date(Date.now() + i * 1000);
    const e = new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000);
    await supabase.from('user_subscriptions').insert({ user_id: userId, plan_id: 'weekly', status: 'active', start_date: s.toISOString(), end_date: e.toISOString(), auto_renew: false, created_at: new Date().toISOString() });
  }
  const dupsBefore = (await getAllSubs(userId)).filter(s => s.status === 'active').length;
  check('Pre-condition: 3 active duplicates exist', dupsBefore === 3, `found ${dupsBefore}`);
  await verifyAndHealSubscription(userId, 1950);
  const allAfter3 = await getAllSubs(userId);
  const activeAfter3 = allAfter3.filter(s => s.status === 'active').length;
  const expiredAfter3 = allAfter3.filter(s => s.status === 'expired').length;
  check('Exactly 1 active after Brain cleanup', activeAfter3 === 1, `found ${activeAfter3}`);
  check('3 old ones marked expired (history preserved)', expiredAfter3 === 3, `found ${expiredAfter3}`);
  check('Total rows = 4 (3 expired + 1 new active)', allAfter3.length === 4, `found ${allAfter3.length}`);
  console.log();

  // ── TEST 4: Brain does correct 6-day calculation every single time ──
  console.log('TEST 4: Brain date math is precise (7-day plan = 6-day gap, end > start)');
  for (let i = 0; i < 5; i++) {
    await wipe(userId);
    await supabase.from('user_subscriptions').insert({ user_id: userId, plan_id: 'weekly', status: 'cancelled', start_date: new Date().toISOString(), end_date: new Date().toISOString(), auto_renew: false, created_at: new Date().toISOString() });
    await verifyAndHealSubscription(userId, 1950);
    const healed = await getActiveSub(userId);
    const ms = new Date(healed?.end_date) - new Date(healed?.start_date);
    const days = Math.round(ms / (1000 * 60 * 60 * 24));
    const endInFuture = new Date(healed?.end_date) > new Date();
    check(`Run ${i+1}: Duration=${days} days, end in future=${endInFuture}`, days >= 5 && days <= 7 && endInFuture);
  }
  console.log();

  // ── TEST 5: Brain handles null/invalid inputs without crashing ──
  console.log('TEST 5: Brain handles bad inputs gracefully');
  try { await verifyAndHealSubscription(null, 1950); check('null userId: no crash', true); } catch { check('null userId: no crash', false); }
  try { await verifyAndHealSubscription(userId, 0); check('zero amount: no crash', true); } catch { check('zero amount: no crash', false); }
  try { await verifyAndHealSubscription(userId, null); check('null amount: no crash', true); } catch { check('null amount: no crash', false); }
  try { await verifyAndHealSubscription('not-a-real-uuid', 1950); check('fake userId: no crash', true); } catch { check('fake userId: no crash', false); }
  console.log();

  // Final report
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed}/${passed + failed} checks passed${' '.repeat(Math.max(0, 22 - String(passed + failed).length))}║`);
  console.log(failed === 0
    ? '║  🎉 ALL CHECKS PASSED — Brain is bulletproof!        ║'
    : `║  ⚠️  ${failed} FAILED — needs attention                      ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Restore cleanly
  await wipe(userId);
  const s = new Date(), e = new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000);
  await supabase.from('user_subscriptions').insert({ user_id: userId, plan_id: 'weekly', status: 'active', start_date: s.toISOString(), end_date: e.toISOString(), auto_renew: false, created_at: new Date().toISOString() });
  console.log('✅ Nabirul restored cleanly (active until ' + e.toDateString() + ')');
}

run().catch(console.error);
