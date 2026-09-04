import supabase from '../utils/supabaseClient.js';
import { verifyAndHealSubscription } from '../services/subscriptionBrain.js';
import * as rentalService from '../services/rentalService.js';
import * as subscriptionService from '../services/subscriptionService.js';
import * as iot from '../services/iotService.js';

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

    // 4. Sweep Active Rentals for Expired Subscriptions
    await sweepActiveRentalsForExpiredSubscriptions();

    // 5. Sweep Available Bikes to Ensure Lock Status
    await sweepAvailableBikesLockStatus();

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

async function sweepActiveRentalsForExpiredSubscriptions() {
  console.log('[BrainSweep] Checking active rentals for missing/expired subscriptions...');
  const { data: activeRentals, error } = await supabase
    .from('rentals')
    .select('*')
    .in('status', ['active', 'ongoing']);
    
  if (error) {
    if (error.code === "PGRST205" || String(error.message).includes("public.rentals")) return;
    console.error('[BrainSweep] Error fetching active rentals:', error);
    return;
  }
  
  if (!activeRentals || activeRentals.length === 0) return;
  
  let healedCount = 0;
  const now = new Date();

  for (const rental of activeRentals) {
    try {
      // 1. Fetch user's latest subscription
      const { data: latestSub } = await supabase
        .from('user_subscriptions')
        .select('end_date, status')
        .eq('user_id', rental.user_id)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSub && latestSub.end_date) {
        // If user has an active subscription in progress, sync rental end_time
        if (latestSub.status === 'active' && new Date(latestSub.end_date) > now) {
          if (rental.end_time !== latestSub.end_date) {
            await supabase.from('rentals').update({ end_time: latestSub.end_date, updated_at: now.toISOString() }).eq('id', rental.id);
            console.log(`[BrainSweep] Auto-synced rental ${rental.id} end_time to ${latestSub.end_date}`);
          }
          continue;
        }

        // Check if user is still within the 9:30 AM IST next-day grace period!
        if (!subscriptionService.hasPassedGracePeriod(latestSub.end_date)) {
          // Still in grace period — do NOT force lock yet!
          const graceExp = subscriptionService.getGracePeriodExpiry(latestSub.end_date);
          if (rental.end_time !== graceExp.toISOString()) {
            await supabase.from('rentals').update({ end_time: graceExp.toISOString(), updated_at: now.toISOString() }).eq('id', rental.id);
            console.log(`[BrainSweep] Auto-synced rental ${rental.id} end_time to 09:30 AM grace cutoff (${graceExp.toISOString()})`);
          }
          continue;
        }
      }

      // Past 9:30 AM grace period (or user has no subscription): force expire and lock
      console.log(`[BrainSweep] Rental ${rental.id} (user ${rental.user_id}) is past grace period without active plan. Expiring...`);
      await rentalService.forceExpireActiveRentalForUser(rental.user_id);
      healedCount++;
    } catch (e) {
      console.error(`[BrainSweep] Failed to evaluate rental ${rental.id}:`, e.message);
    }
  }
  
  if (healedCount > 0) {
    console.log(`[BrainSweep] Rental Sweep Complete: Force ended ${healedCount} expired rentals.`);
  }
}

async function sweepAvailableBikesLockStatus() {
  // Available hub inventory and unlinked bikes remain in their current state (default unlocked per admin setting)
  // We do not send blind commands to unassigned bikes to protect 12V battery and avoid LocoNav rate limits.
  return;
}
