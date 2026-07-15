import supabase from '../utils/supabaseClient.js';

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

    // 4. Determine the expected plan and duration based on payment amount
    let expectedDurationDays = 7;
    let expectedPlanId = "weekly"; // safe fallback

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("price", Number(paymentAmount))
      .limit(1)
      .maybeSingle();

    if (plan) {
      expectedDurationDays = plan.duration_days || 7;
      expectedPlanId = plan.id;
    } else {
      console.warn(`[SubscriptionBrain] Unrecognized payment amount Rs.${paymentAmount}, defaulting to 7 days.`);
    }

    // 5. Verification — determine if healing is needed
    let needsHeal = false;
    let healReason = "";

    // Case A: No subscriptions at all
    if (subs.length === 0) {
      needsHeal = true;
      healReason = "Missing subscription entirely";
    }
    // Case B: Multiple active subscriptions (duplicates — should never happen)
    else if (activeSubs.length > 1) {
      needsHeal = true;
      healReason = `Found ${activeSubs.length} active subscriptions (duplicates detected)`;
    }
    // Case C: No active subscription found
    else if (!latestActive) {
      needsHeal = true;
      healReason = `Status is '${subs[0]?.status}' instead of active`;
    }
    // Case D: Active sub exists but end date is in the past
    else if (new Date(latestActive.end_date) <= now) {
      needsHeal = true;
      healReason = `End date is in the past (${new Date(latestActive.end_date).toISOString()})`;
    }
    // Case E: Active sub exists but duration is too short
    else {
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
      console.log(`[SubscriptionBrain] HEALING SUBSCRIPTION for user ${userId}...`);

      // Start date: always NOW for a fresh renewal
      const startDate = new Date();

      // Calculate correct end date (inclusive: 7-day plan = start + 6 days)
      const endDate = new Date(startDate.getTime() + (expectedDurationDays - 1) * 24 * 60 * 60 * 1000);

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
      } else {
        console.log(`[SubscriptionBrain] SUCCESS: User ${userId} healed. Active until ${endDate.toISOString()}`);
      }
    } else {
      console.log(`[SubscriptionBrain] Verification passed. Subscription is perfectly healthy.`);
    }

  } catch (error) {
    console.error("[SubscriptionBrain] Critical error during verification:", error);
  }
}
