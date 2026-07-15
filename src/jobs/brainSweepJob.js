import supabase from '../utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../services/subscriptionBrain.js';

/**
 * Proactive Brain Sweep — runs every 6 hours.
 *
 * Checks every "success" payment made in the last 6 hours and
 * verifies the user actually received their subscription.
 * If not, it heals them exactly like the reactive brain does.
 *
 * This is the safety net for server crashes/restarts that may have
 * caused the reactive Brain to miss a payment approval event.
 */
export async function runBrainSweep() {
  console.log('[BrainSweep] ====== Starting proactive subscription sweep ======');

  try {
    // 1. Look at all payments marked success in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: recentPayments, error: payErr } = await supabase
      .from('payments')
      .select('id, user_id, amount, status, created_at, updated_at')
      .eq('status', 'success')
      .gte('updated_at', sixHoursAgo)
      .order('updated_at', { ascending: false });

    if (payErr) {
      console.error('[BrainSweep] Failed to fetch recent payments:', payErr.message);
      return;
    }

    const payments = recentPayments || [];
    console.log(`[BrainSweep] Found ${payments.length} successful payment(s) in last 6 hours to verify.`);

    if (payments.length === 0) {
      await logSweepRun(0, 0, 0);
      return;
    }

    // 2. Deduplicate by user_id — only process the most recent payment per user
    const seenUsers = new Set();
    const uniquePayments = [];
    for (const p of payments) {
      if (p.user_id && !seenUsers.has(p.user_id)) {
        seenUsers.add(p.user_id);
        uniquePayments.push(p);
      }
    }
    console.log(`[BrainSweep] ${uniquePayments.length} unique user(s) to check.`);

    let healedCount = 0;
    let healthyCount = 0;

    for (const payment of uniquePayments) {
      try {
        // 3. Check if user has a valid active subscription right now
        const now = new Date();
        const { data: activeSubs } = await supabase
          .from('user_subscriptions')
          .select('id, status, start_date, end_date, plan_id')
          .eq('user_id', payment.user_id)
          .eq('status', 'active')
          .gt('end_date', now.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        const hasValidSub = activeSubs && activeSubs.length > 0;

        if (hasValidSub) {
          // Subscription is fine — no action needed
          healthyCount++;
          console.log(`[BrainSweep] User ${payment.user_id} — HEALTHY (active sub valid until ${activeSubs[0].end_date})`);
        } else {
          // No valid subscription found — run the Brain healer
          console.log(`[BrainSweep] User ${payment.user_id} — MISSING or BROKEN subscription after payment. Triggering heal...`);
          await verifyAndHealSubscription(payment.user_id, payment.amount);
          healedCount++;
        }

        // Small delay between users to not hammer the database
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (userErr) {
        console.error(`[BrainSweep] Error checking user ${payment.user_id}:`, userErr.message);
      }
    }

    console.log(`[BrainSweep] ====== Sweep complete: ${healthyCount} healthy, ${healedCount} healed ======`);
    await logSweepRun(uniquePayments.length, healthyCount, healedCount);

  } catch (err) {
    console.error('[BrainSweep] Critical sweep failure:', err);
  }
}

/**
 * Log the sweep summary to brain_activity_logs
 * so it shows up on the admin monitor.
 */
async function logSweepRun(totalChecked, healthy, healed) {
  try {
    await supabase.from('brain_activity_logs').insert({
      user_id: 'SWEEP',
      user_name: 'Brain Auto-Sweep',
      payment_amount: null,
      action: 'SWEEP',
      reason: `6-hour sweep: ${totalChecked} checked, ${healthy} healthy, ${healed} healed`,
      old_status: null,
      new_status: null,
      plan_id: null,
      backdated: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[BrainSweep] Could not log sweep run:', err?.message);
  }
}
