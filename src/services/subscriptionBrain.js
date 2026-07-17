import supabase from '../utils/supabaseClient.js';

// Track when the Brain service started (for monitor uptime display)
export const BRAIN_START_TIME = new Date();

/**
 * Log a Brain action to the brain_activity_logs table.
 * Silent — never throws, never blocks the main flow.
 */
async function logBrainAction({ userId, userName, paymentAmount, action, reason, oldStatus, newStatus, oldEndDate, newEndDate, planId, backdated }) {
  try {
    await supabase.from("brain_activity_logs").insert({
      user_id: userId,
      user_name: userName || null,
      payment_amount: paymentAmount || null,
      action,
      reason: reason || null,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      old_end_date: oldEndDate || null,
      new_end_date: newEndDate || null,
      plan_id: planId || null,
      backdated: backdated || false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[SubscriptionBrain] Could not write log:", err?.message);
  }
}

/**
 * Self-healing mechanism for verifying and fixing subscription states
 * after a payment is marked as successful by an admin.
 */
export async function verifyAndHealSubscription(userId, paymentAmount) {
  try {
    if (!userId || !paymentAmount) return;

    // 1. Wait 3 seconds to allow normal flows (like createSubscription) to finish their DB transactions
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`[SubscriptionBrain] Checking subscription health for user ${userId}...`);

    // 1b. Verify the user actually exists — prevents garbage rows from bad/test data
    const { data: userRecord } = await supabase.from("users").select("id, full_name, phone").eq("id", userId).maybeSingle();
    if (!userRecord) {
      console.warn(`[SubscriptionBrain] Aborting — user ${userId} does not exist in users table.`);
      return;
    }
    const userName = userRecord.full_name || userRecord.phone || userId;

    // 2. Fetch ALL subscriptions for this user, ordered newest first
    const { data: allSubs } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const subs = allSubs || [];
    const now = new Date();

    // 3. Find all active subscriptions (should be exactly 1, never more)
    const activeSubs = subs.filter(s => s.status === "active");
    const latestActive = activeSubs[0] || null;

    // 4. Get the subscription plan from DB.
    // We do NOT match by payment amount because ₹3450 = ₹1950 (subscription) + ₹1500 (one-time
    // registration fee). Matching ₹3450 would find no plan. Instead, always use the active plan.
    let expectedDurationDays = 7;
    let expectedPlanId = "weekly_plan"; // correct fallback (not "weekly")

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (plan) {
      expectedDurationDays = plan.duration_days || 7;
      expectedPlanId = plan.id;
      console.log(`[SubscriptionBrain] Using plan: ${plan.name} (${expectedDurationDays} days) for heal.`);
    } else {
      console.warn(`[SubscriptionBrain] No active plan found in DB, defaulting to 7 days / weekly_plan.`);
    }

    // 5. Verification — determine if healing is needed
    let needsHeal = false;
    let healReason = "";

    if (subs.length === 0) {
      needsHeal = true;
      healReason = "Missing subscription entirely";
    } else if (activeSubs.length > 1) {
      needsHeal = true;
      healReason = `Found ${activeSubs.length} active subscriptions (duplicates detected)`;
    } else if (!latestActive) {
      needsHeal = true;
      healReason = `Status is '${subs[0]?.status}' instead of active`;
    } else if (new Date(latestActive.end_date) <= now) {
      needsHeal = true;
      healReason = `End date is in the past (${new Date(latestActive.end_date).toISOString()})`;
    } else {
      const msDiff = new Date(latestActive.end_date) - new Date(latestActive.start_date);
      const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
      if (daysDiff < expectedDurationDays - 2) {
        needsHeal = true;
        healReason = `Subscription too short: ${daysDiff} days (expected ~${expectedDurationDays - 1})`;
      }
    }

    // 6. Healing Action
    if (needsHeal) {
      console.log(`[SubscriptionBrain] Issue detected: ${healReason}`);
      console.log(`[SubscriptionBrain] HEALING SUBSCRIPTION for user ${userId} (${userName})...`);

      // Smart Backdating: Same logic as createSubscription —
      // If the user still has an active rental (kept the bike), start from the previous sub's end date
      let startDate = new Date();
      let backdated = false;

      try {
        const mostRecentSub = subs[0]; // newest record regardless of status
        if (mostRecentSub && mostRecentSub.end_date) {
          const { data: latestRental } = await supabase
            .from("rentals")
            .select("id, status")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const hasBike = latestRental && ["active", "ongoing", "expired"].includes(latestRental.status);

          if (hasBike) {
            const prevEnd = new Date(mostRecentSub.end_date);
            if (prevEnd < now) {
              // Bike still with user, backdate to previous end to avoid gap
              startDate = prevEnd;
              backdated = true;
              console.log(`[SubscriptionBrain] Backdating to previous end date: ${startDate.toISOString()} (user has active rental)`);
            }
          }
        }
      } catch (err) {
        console.warn("[SubscriptionBrain] Backdate check failed, using now:", err?.message);
      }

      // Calculate correct end date (inclusive: 7-day plan = start + 6 days)
      const endDate = new Date(startDate.getTime() + (expectedDurationDays - 1) * 24 * 60 * 60 * 1000);

      // Record old state for logging
      const oldStatus = latestActive?.status || subs[0]?.status || null;
      const oldEndDate = latestActive?.end_date || subs[0]?.end_date || null;

      // Step 1: Expire ALL existing active subscriptions (clean up any duplicates too)
      if (activeSubs.length > 0) {
        const activeIds = activeSubs.map(s => s.id);
        await supabase
          .from("user_subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .in("id", activeIds);
        console.log(`[SubscriptionBrain] Expired ${activeIds.length} old active subscription(s) before healing.`);
      }

      // Step 2: Insert a fresh new subscription record (preserves full history)
      const { error: insertErr } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: userId,
          plan_id: String(expectedPlanId),
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertErr) {
        console.error(`[SubscriptionBrain] FATAL: Failed to heal subscription!`, insertErr);
        await logBrainAction({ userId, userName, paymentAmount, action: "HEAL_FAILED", reason: healReason, oldStatus, oldEndDate, planId: String(expectedPlanId), backdated });
      } else {
        console.log(`[SubscriptionBrain] SUCCESS: User ${userId} (${userName}) healed. Active until ${endDate.toISOString()}${backdated ? " [BACKDATED]" : ""}`);
        await logBrainAction({ userId, userName, paymentAmount, action: "HEALED", reason: healReason, oldStatus, newStatus: "active", oldEndDate, newEndDate: endDate.toISOString(), planId: String(expectedPlanId), backdated });
      }
    } else {
      console.log(`[SubscriptionBrain] Verification passed. Subscription is perfectly healthy for ${userName}.`);
      await logBrainAction({ userId, userName, paymentAmount, action: "HEALTHY", reason: "Subscription verified OK — no action needed", planId: latestActive?.plan_id || null });
    }

  } catch (error) {
    console.error("[SubscriptionBrain] Critical error during verification:", error);
  }
}
