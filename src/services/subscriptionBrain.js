import supabase from '../utils/supabaseClient.js';

/**
 * Self-healing mechanism for verifying and fixing subscription states
 * after a payment is marked as successful.
 */
export async function verifyAndHealSubscription(userId, paymentAmount) {
  try {
    if (!userId || !paymentAmount) return;

    // 1. Wait 3 seconds to allow normal flows (like createSubscription) to finish their DB transactions
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`[SubscriptionBrain] Checking subscription health for user ${userId}...`);

    // 2. Fetch the user's current subscription state
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    let needsHeal = false;

    // 3. Determine the expected plan and duration based on the admin-approved payment amount
    let expectedDurationDays = 7;
    let expectedPlanId = "weekly"; // fallback
    
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
      console.warn(`[SubscriptionBrain] Unrecognized payment amount ${paymentAmount}, defaulting to 7 days.`);
    }

    // 4. Verification Logic
    if (!sub) {
      console.log(`[SubscriptionBrain] Issue detected: Missing subscription entirely.`);
      needsHeal = true;
    } else {
      if (sub.status !== "active") {
        console.log(`[SubscriptionBrain] Issue detected: Status is ${sub.status} instead of active.`);
        needsHeal = true;
      }
      
      const endDate = new Date(sub.end_date);
      if (endDate <= now) {
        console.log(`[SubscriptionBrain] Issue detected: End date is in the past (${endDate.toISOString()}).`);
        needsHeal = true;
      }
      
      const msDiff = endDate.getTime() - new Date(sub.start_date).getTime();
      const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
      
      // We expect the difference to be duration - 1 (e.g. 7 days inclusive is a 6 day difference)
      // Give a tiny bit of leeway (duration - 2) in case of minute boundary issues
      if (daysDiff < expectedDurationDays - 2) {
        console.log(`[SubscriptionBrain] Issue detected: Subscription too short (${daysDiff} days).`);
        needsHeal = true;
      }
    }

    // 5. Healing Action
    if (needsHeal) {
      console.log(`[SubscriptionBrain] HEALING SUBSCRIPTION for user ${userId}...`);
      
      let startDate = new Date();
      // If there's a recent subscription that expired within the last 7 days, backdate to its end date
      if (sub && sub.end_date) {
        const oldEnd = new Date(sub.end_date);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (oldEnd > sevenDaysAgo && oldEnd < now) {
          startDate = oldEnd;
          console.log(`[SubscriptionBrain] Backdating to previous end date: ${startDate.toISOString()}`);
        } else if (oldEnd > now) {
          // It's still active but somehow broken? Just start from now to be safe, or keep the old end date?
          // If we are healing an active but broken sub, we start from its start date.
          startDate = new Date(sub.start_date);
        }
      }

      // Calculate new end date (inclusive)
      const endDate = new Date(startDate.getTime() + (expectedDurationDays - 1) * 24 * 60 * 60 * 1000);

      // Step 1: Expire any existing active/broken subscription
      if (sub) {
        await supabase
          .from("user_subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        console.log(`[SubscriptionBrain] Expired old subscription ${sub.id} before healing.`);
      }

      // Step 2: Insert a fresh new subscription record (preserves history)
      const { error: upsertErr } = await supabase
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

      if (upsertErr) {
        console.error(`[SubscriptionBrain] FATAL: Failed to heal subscription!`, upsertErr);
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
