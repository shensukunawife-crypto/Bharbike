import supabase from "../utils/supabaseClient.js";
import { createUserNotification } from "./notificationService.js";
import { nowIST, addISTDays, toISTDateStr } from "../utils/istTime.js";
import { reactivateRentalOnPlanRenewal } from "./rentalService.js";

const MOCK_PLANS = [
  {
    id: "plan_weekly",
    name: "weekly_plan",
    display_name: "Weekly Plan",
    description: "Full access to BHAR BIKE fleet for 7 days.",
    price: 1950,
    duration_days: 7,
    features: JSON.stringify(["Unlock ALL hubs", "Unlimited daily rides", "Priority support", "Free maintenance"]),
    is_active: true
  }
];

const mockSubscriptionsDB = new Map();

function isDatabaseError(error) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("row-level security") || msg.includes("could not find the table") || error.code === "42P01" || error.code === "42501";
}

/**
 * Helper to check if a subscription is past its grace period.
 * Grace period ends at 9:30 AM IST on the day AFTER the end_date (IST calendar day).
 *
 * Uses addISTDays() to advance by 1 IST calendar day — never raw UTC setDate()
 * which shifts the day boundary incorrectly when the server runs in UTC.
 */
export function hasPassedGracePeriod(endDateStr) {
  if (!endDateStr) return true;
  const end = new Date(endDateStr);
  const now = new Date();

  // Advance by 1 IST calendar day (IST midnight of the day after end_date)
  const nextISTDay = addISTDays(end, 1); // IST midnight of next day

  // Grace expires at 9:30 AM IST = IST midnight + 9h30m
  const graceExp = new Date(nextISTDay.getTime() + (9 * 60 + 30) * 60 * 1000);

  return now > graceExp;
}

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans() {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      if (isDatabaseError(error)) return MOCK_PLANS;
      throw error;
    }
    return data && data.length > 0 ? data : MOCK_PLANS;
  } catch (error) {
    console.error("[subscriptionService] getSubscriptionPlans failed:", error.message);
    throw error;
  }
}

/**
 * Get a specific subscription plan by ID
 */
const isValidUuid = (str) => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Legacy plan ID mapping — normalizes old IDs to current ones permanently
const LEGACY_PLAN_ID_MAP = {
  'weekly': 'weekly_plan',
  'monthly': 'monthly_plan',
  'weekly_plan_old': 'weekly_plan',
  'plan_weekly': 'weekly_plan',
  'plan_monthly': 'monthly_plan',
  'Weekly Plan': 'weekly_plan',
  'Monthly Plan': 'monthly_plan',
};

export async function getSubscriptionPlanById(planId) {
  try {
    // Normalize legacy plan IDs before any lookup
    if (planId && LEGACY_PLAN_ID_MAP[planId]) {
      planId = LEGACY_PLAN_ID_MAP[planId];
    }

    let data = null;
    let error = null;

    // Try UUID lookup first only if valid UUID
    if (isValidUuid(planId)) {
      const res = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .single();
      data = res.data;
      error = res.error;
    }

    // If not found, try by name (payment flow may pass plan name as plan_id)
    if (!data) {
      const byName = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("name", planId)
        .single();
      if (!byName.error && byName.data) {
        data = byName.data;
        error = null;
      }
    }

    // If still not found, try by display_name
    if (error || !data) {
      const byDisplay = await supabase
        .from("subscription_plans")
        .select("*")
        .ilike("display_name", `%${planId}%`)
        .limit(1)
        .single();
      if (!byDisplay.error && byDisplay.data) {
        data = byDisplay.data;
        error = null;
      }
    }

    if (error) {
      if (isDatabaseError(error)) {
        const mockPlan = MOCK_PLANS.find(p => p.id === planId || p.name === planId || p.display_name.toLowerCase().includes(planId.toLowerCase()));
        if (mockPlan) return mockPlan;
      }
      throw error;
    }
    if (!data) {
      const mockPlan = MOCK_PLANS.find(p => p.id === planId || p.name === planId || p.display_name.toLowerCase().includes(planId.toLowerCase()));
      if (mockPlan) return mockPlan;
    }
    if (data && data.display_name) {
      const dn = String(data.display_name);
      if (dn.length > 30 && dn.includes("-")) {
        data.display_name = "Weekly Plan";
      }
    }
    return data;
  } catch (error) {
    console.error("[subscriptionService] getSubscriptionPlanById failed:", error.message);
    throw error;
  }
}

/**
 * Get user's active subscription
 */
export async function getUserActiveSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[getUserActiveSubscription] query error, trying fallback:", error.message);
      // Try without join or other filters
      const { data: rawData, error: rawError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rawData) {
        if (hasPassedGracePeriod(rawData.end_date)) return null;
        let planData = null;
        try {
          planData = await getSubscriptionPlanById(rawData.plan_id);
        } catch {}
        return { ...rawData, plan: planData || { display_name: "Active Plan" } };
      }
      
      if (isDatabaseError(error) || isDatabaseError(rawError)) {
        const mockSub = mockSubscriptionsDB.get(userId) || null;
        if (mockSub && hasPassedGracePeriod(mockSub.end_date)) return null;
        return mockSub;
      }
      return null;
    }

    if (!data || hasPassedGracePeriod(data.end_date)) {
      return null;
    }

    if (data && data.plan && data.plan.display_name) {
      const dn = String(data.plan.display_name);
      if (dn.length > 30 && dn.includes("-")) {
        data.plan.display_name = "Weekly Plan";
      }
    }
    return data;
  } catch (error) {
    console.error("[subscriptionService] getUserActiveSubscription failed:", error.message);
    return null;
  }
}

/**
 * Get all user subscriptions (active and past)
 */
export async function getUserSubscriptions(userId) {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isDatabaseError(error)) {
        const activeSub = mockSubscriptionsDB.get(userId);
        return activeSub ? [activeSub] : [];
      }
      throw error;
    }
    // Enrich with plan data separately
    const subs = data || [];
    for (const sub of subs) {
      try {
        const plan = await getSubscriptionPlanById(sub.plan_id);
        sub.plan = plan || { display_name: "Active Plan", price: null, duration_days: null };
      } catch { sub.plan = { display_name: "Active Plan", price: null, duration_days: null }; }
    }
    return subs;
  } catch (error) {
    console.error("[subscriptionService] getUserSubscriptions failed:", error.message);
    throw error;
  }
}

/**
 * Create a new subscription for user
 */
export async function createSubscription(userId, planId, paymentId = null, paidAmount = null, overrideStartDate = null) {
  try {
    // Get plan details
    const plan = await getSubscriptionPlanById(planId);
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // === ABSORB PAYMENT LOGIC ===
    // If the user already has an active subscription, and it is "unpaid" (no successful payments within 24h of its creation),
    // we assume this payment is to clear the debt for that current active subscription.
    // In that case, we DO NOT push the dates forward (we do not create a new subscription).
    const { data: activeSub } = await supabase
      .from("user_subscriptions")
      .select("id, created_at, start_date, end_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (activeSub) {
      const activeSubTime = new Date(activeSub.created_at).getTime();
      let query = supabase.from("payments").select("id, created_at").eq("user_id", userId).eq("status", "success");
      if (paymentId) {
        query = query.neq("id", paymentId);
      }
      const { data: priorPayments } = await query;

      let isUnpaid = true;
      if (priorPayments && priorPayments.length > 0) {
        for (const p of priorPayments) {
          const pTime = new Date(p.created_at).getTime();
          if (Math.abs(pTime - activeSubTime) < 24 * 60 * 60 * 1000) {
            isUnpaid = false;
            break;
          }
        }
      }

      if (isUnpaid) {
        console.log(`[createSubscription] Active sub ${activeSub.id} appears unpaid. Absorbing payment ${paymentId} without pushing dates forward.`);
        await supabase.from("user_subscriptions").update({ updated_at: new Date().toISOString() }).eq("id", activeSub.id);
        
        try {
          const planObj = await getSubscriptionPlanById(planId);
          return { ...activeSub, plan: planObj || { display_name: "Active Plan", price: null, duration_days: null }, _absorbed: true };
        } catch {
          return { ...activeSub, plan: { display_name: "Active Plan", price: null, duration_days: null }, _absorbed: true };
        }
      }
    }
    // =============================


    // New Subscription Start Date Logic:
    // 1. If user has an active subscription, new plan starts the day AFTER current one ends.
    // 2. If user is within 7 days of expiry of last sub, backdate to day after expiry.
    // 3. Otherwise, start today.
    let startDate = nowIST();
    try {
      const { data: activeOrRecentSub } = await supabase
        .from("user_subscriptions")
        .select("end_date")
        .eq("user_id", userId)
        .in("status", ["active", "expired"])
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeOrRecentSub && activeOrRecentSub.end_date) {
        const lastEndDate = new Date(activeOrRecentSub.end_date);
        const now = nowIST();
        
        // If still active or within 7 day grace period
        if (lastEndDate >= now || (now - lastEndDate) / (1000 * 60 * 60 * 24) <= 7) {
          startDate = addISTDays(lastEndDate, 1);
          console.log(`[createSubscription] Extending subscription. Starting on ${toISTDateStr(startDate)} IST`);
        } else {
          // Beyond grace — fresh start.
          // If admin passed a payment date override, backdate to that date (max 30 days back, not future).
          if (overrideStartDate) {
            const overrideMs = new Date(overrideStartDate).getTime();
            const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
            if (overrideMs >= thirtyDaysAgoMs && overrideMs <= now.getTime()) {
              // Use IST midnight of the payment date
              const payIST = new Date(overrideMs + 5.5 * 60 * 60 * 1000);
              payIST.setUTCHours(0, 0, 0, 0);
              startDate = new Date(payIST.getTime() - 5.5 * 60 * 60 * 1000); // back to UTC for storage
              console.log(`[createSubscription] Backdating fresh start to payment date: ${toISTDateStr(startDate)} IST`);
            } else {
              startDate = now;
              console.log(`[createSubscription] Override date out of range, using today: ${toISTDateStr(startDate)} IST`);
            }
          } else {
            startDate = now;
          }
        }
      }
    } catch (err) {
      console.warn("[createSubscription] Date calculation failed, using current IST date:", err?.message);
    }

    // Calculate end date: user gets the FULL last riding day until 11 PM IST.
    // e.g. 7-day plan starting July 23 IST → last day is July 29 → expires at 11:00 PM IST on July 29.
    // Last day midnight IST = start + (duration_days - 1) days, then add 23 hours for 11 PM IST.
    const lastDayMidnightIST = addISTDays(startDate, plan.duration_days - 1);
    const endDate = new Date(lastDayMidnightIST.getTime() + 23 * 60 * 60 * 1000); // 11 PM IST of last day

    // Determine status: If the user paid so late that the new end date is STILL in the past, it's expired.
    const subStatus = endDate > new Date() ? "active" : "expired";

    // Step 1: Expire the old active subscription (so we preserve history instead of overwriting it)
    const { data: oldSub } = await supabase
      .from("user_subscriptions")
      .select("id, end_date")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (oldSub) {
      await supabase
        .from("user_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", oldSub.id);
      console.log(`[subscriptionService] Expired old subscription ${oldSub.id} before creating new one.`);
    }

    // Step 2: Insert a brand new subscription record (preserves full history)
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        status: subStatus,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (!error && data) {
      try {
        const { data: userProfile } = await supabase.from("users").select("full_name").eq("id", userId).maybeSingle();
        if (userProfile && userProfile.full_name) {
          await supabase.from("rider_skipped_days")
            .update({ status: "Inactive" })
            .eq("rider_name", userProfile.full_name)
            .eq("status", "Active");
        }
      } catch (e) {
        console.error("[subscriptionService] failed to clear skipped days on rejoin:", e);
      }
      
      try {
        const plan = await getSubscriptionPlanById(data.plan_id);
        data.plan = plan || { display_name: "Active Plan", price: null, duration_days: null };
      } catch { data.plan = { display_name: "Active Plan", price: null, duration_days: null }; }
    }

    if (error) {
      if (isDatabaseError(error)) {
        const mockSub = {
          id: "sub_" + Math.random().toString(36).substring(7),
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: false,
          plan: plan
        };
        mockSubscriptionsDB.set(userId, mockSub);
        
        // Trigger notification for simulated DB
        createUserNotification(
          userId,
          "Subscription Activated! 🚲",
          `Your ${plan.display_name} subscription has been activated! Enjoy unlimited rides and premium modules.`,
          "success"
        ).catch((err) => console.warn("[subscriptionService.createSubscription] mock notification failed:", err?.message));

        return mockSub;
      }
      throw error;
    }

    // Use paidAmount if provided and greater than 0, otherwise default to plan.price
    const finalBillingAmount = (paidAmount && Number(paidAmount) > 0) ? Number(paidAmount) : plan.price;

    // Create billing record
    await createBillingRecord(data.id, userId, finalBillingAmount, "paid", paymentId);

    // Trigger notification for real DB
    createUserNotification(
      userId,
      "Subscription Activated! 🚲",
      `Your ${plan.display_name} subscription has been activated! Enjoy unlimited rides and premium modules.`,
      "success"
    ).catch((err) => console.warn("[subscriptionService.createSubscription] notification failed:", err?.message));

    // Auto-reactivate rental if user still has the bike physically (non-blocking)
    reactivateRentalOnPlanRenewal(userId, data.end_date)
      .then(rentalId => { if (rentalId) console.log(`[subscriptionService] Auto-reactivated rental ${rentalId} for user ${userId} on plan renewal`); })
      .catch(err => console.warn(`[subscriptionService] Rental reactivation skipped:`, err?.message));

    return data;
  } catch (error) {
    console.error("[subscriptionService] createSubscription failed:", error.message);
    throw error;
  }
}

/**
 * Cancel user's active subscription
 */
export async function cancelSubscription(userId, subscriptionId, reason = null) {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .update({
        status: "cancelled",
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .eq("status", "active")
      .select()
      .maybeSingle();

    if (error) {
      if (isDatabaseError(error)) {
        const mockSub = mockSubscriptionsDB.get(userId);
        if (mockSub && mockSub.id === subscriptionId) {
          mockSub.status = "cancelled";
          mockSub.cancelled_at = new Date().toISOString();
          mockSub.cancellation_reason = reason;
          mockSubscriptionsDB.delete(userId); // remove from active
          
          // Trigger notification for simulated DB
          const endDateFormatted = mockSub.end_date ? new Date(mockSub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "the end of your period";
          createUserNotification(
            userId,
            "Subscription Cancelled 🔴",
            `Your subscription has been cancelled. It will remain active with full benefits until ${endDateFormatted}.`,
            "info"
          ).catch((err) => console.warn("[subscriptionService.cancelSubscription] mock notification failed:", err?.message));

          return mockSub;
        }
      }
      throw error;
    }

    if (!data) {
      // Check if subscription exists and is already cancelled
      const { data: existing } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        if (existing.status === "cancelled") {
          return existing;
        }
        throw new Error(`Subscription status is '${existing.status}', cannot cancel.`);
      }
      throw new Error("Active subscription not found to cancel.");
    }

    // Trigger notification for real DB
    const endDateFormatted = data.end_date ? new Date(data.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "the end of your period";
    createUserNotification(
      userId,
      "Subscription Cancelled 🔴",
      `Your subscription has been cancelled. It will remain active with full benefits until ${endDateFormatted}.`,
      "info"
    ).catch((err) => console.warn("[subscriptionService.cancelSubscription] notification failed:", err?.message));

    return data;
  } catch (error) {
    console.error("[subscriptionService] cancelSubscription failed:", error.message);
    throw error;
  }
}

/**
 * Get user's billing history
 */
export async function getUserBillingHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from("subscription_billing")
      .select("*")
      .eq("user_id", userId)
      .order("billing_date", { ascending: false })
      .limit(limit);

    if (error) {
      if (isDatabaseError(error)) return [];
      throw error;
    }

    const bills = data || [];
    for (const bill of bills) {
      try {
        if (bill.subscription_id) {
          const { data: subData } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("id", bill.subscription_id)
            .maybeSingle();
          if (subData) {
            bill.subscription = subData;
            // Enrich subscription with plan
            const plan = await getSubscriptionPlanById(subData.plan_id);
            bill.subscription.plan = plan || { display_name: "Active Plan" };
          }
        }
      } catch (enrichErr) {
        console.warn("[getUserBillingHistory] failed to enrich billing item:", enrichErr.message);
      }
    }

    // FIX: If the user has no billing history but has an existing subscription,
    // they are NOT a first-time user. Return a mock billing item to bypass the registration fee in the app.
    if (bills.length === 0) {
      try {
        const { data: subRows } = await supabase
          .from("user_subscriptions")
          .select("id, created_at, plan_id")
          .eq("user_id", userId)
          .limit(1);

        if (subRows && subRows.length > 0) {
          console.log(`[getUserBillingHistory] User ${userId} has no billing records but has a subscription. Returning mock history.`);
          const mockBill = {
            id: `mock-bill-${subRows[0].id}`,
            subscription_id: subRows[0].id,
            user_id: userId,
            amount: 0,
            currency: "INR",
            status: "paid",
            payment_method: "historical",
            razorpay_order_id: "historical",
            razorpay_payment_id: "historical",
            billing_date: subRows[0].created_at || new Date().toISOString(),
            paid_at: subRows[0].created_at || new Date().toISOString(),
            created_at: subRows[0].created_at || new Date().toISOString(),
            subscription: {
              id: subRows[0].id,
              plan_id: subRows[0].plan_id,
              status: "expired",
              plan: {
                display_name: subRows[0].plan_id === "weekly" ? "Weekly Plan" : "Subscription Plan"
              }
            }
          };
          bills.push(mockBill);
        }
      } catch (subErr) {
        console.warn("[getUserBillingHistory] failed to fetch sub check:", subErr.message);
      }
    }

    // FIX: If still no billing history, check for any rental (active or past).
    // Prepaid / admin-assigned users may have a rental but no subscription record.
    // They are existing customers — bypass the registration fee by returning a mock billing entry.
    if (bills.length === 0) {
      try {
        const { data: rentalRows } = await supabase
          .from("rentals")
          .select("id, created_at, start_time")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (rentalRows && rentalRows.length > 0) {
          const r = rentalRows[0];
          console.log(`[getUserBillingHistory] User ${userId} has no billing/subscription but has a rental. Treating as existing customer (prepaid).`);
          const mockBill = {
            id: `mock-bill-rental-${r.id}`,
            subscription_id: null,
            user_id: userId,
            amount: 0,
            currency: "INR",
            status: "paid",
            payment_method: "prepaid",
            razorpay_order_id: "prepaid",
            razorpay_payment_id: "prepaid",
            billing_date: r.created_at || r.start_time || new Date().toISOString(),
            paid_at: r.created_at || r.start_time || new Date().toISOString(),
            created_at: r.created_at || r.start_time || new Date().toISOString(),
            subscription: {
              id: r.id,
              plan_id: "prepaid",
              status: "expired",
              plan: {
                display_name: "Prepaid Plan"
              }
            }
          };
          bills.push(mockBill);
        }
      } catch (rentalErr) {
        console.warn("[getUserBillingHistory] failed to fetch rental check:", rentalErr.message);
      }
    }

    return bills;
  } catch (error) {
    console.error("[subscriptionService] getUserBillingHistory failed:", error.message);
    throw error;
  }
}

/**
 * Create a billing record
 */
export async function createBillingRecord(
  subscriptionId,
  userId,
  amount,
  status = "pending",
  paymentId = null
) {
  try {
    const billingData = {
      subscription_id: subscriptionId,
      user_id: userId,
      amount,
      status,
      billing_date: new Date().toISOString(),
    };

    if (status === "paid") {
      billingData.paid_at = new Date().toISOString();
    }

    // Get payment details if paymentId provided
    if (paymentId) {
      const { data: payment } = await supabase
        .from("payments")
        .select("razorpay_order_id, razorpay_payment_id")
        .eq("id", paymentId)
        .single();

      if (payment) {
        billingData.razorpay_order_id = payment.razorpay_order_id ? String(payment.razorpay_order_id).substring(0, 100) : null;
        billingData.razorpay_payment_id = payment.razorpay_payment_id ? String(payment.razorpay_payment_id).substring(0, 100) : null;
      }
    }

    const { data, error } = await supabase
      .from("subscription_billing")
      .insert([billingData])
      .select()
      .single();

    if (error) {
      if (isDatabaseError(error)) return { ...billingData, id: "bill_" + Math.random().toString(36).substring(7) };
      throw error;
    }
    return data;
  } catch (error) {
    console.error("[subscriptionService] createBillingRecord failed:", error.message);
    throw error;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId) {
  try {
    const subscription = await getUserActiveSubscription(userId);
    return !!subscription;
  } catch (error) {
    console.error("[subscriptionService] hasActiveSubscription failed:", error.message);
    return false;
  }
}

/**
 * Update subscription auto-renew setting
 */
export async function updateAutoRenew(userId, subscriptionId, autoRenew) {
  try {
    // BUGFIX: Only update auto_renew flag — NEVER change subscription status here.
    // Turning off auto-renew does NOT cancel the subscription.
    const updateData = { auto_renew: autoRenew };

    const { data, error } = await supabase
      .from("user_subscriptions")
      .update(updateData)
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[subscriptionService] updateAutoRenew failed:", error.message);
    throw error;
  }
}

/**
 * Expire old subscriptions (run as cron job)
 */
export async function expireOldSubscriptions() {
  try {
    // 1. Fetch all potentially expired subscriptions (where end_date is in the past)
    // NOTE: Only target 'active' status — never touch 'cancelled' subscriptions.
    // Cancelled = admin explicitly deactivated the user. Cron must never overwrite this.
    const { data: activeSubs, error: fetchErr } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, end_date")
      .eq("status", "active")
      .lt("end_date", new Date().toISOString());

    if (fetchErr) throw fetchErr;
    
    // 2. Filter for those that have passed the 9:30 AM next-day grace period
    const toExpire = (activeSubs || []).filter(sub => hasPassedGracePeriod(sub.end_date));
    
    if (toExpire.length === 0) {
      console.log(`[subscriptionService] No subscriptions ready for expiration yet.`);
      return [];
    }

    const expireIds = toExpire.map(s => s.id);

    // 3. Mark them as expired
    const { data, error } = await supabase
      .from("user_subscriptions")
      .update({ status: "expired" })
      .in("id", expireIds)
      .select();

    if (error) throw error;
    console.log(`[subscriptionService] Expired ${data?.length || 0} subscriptions that passed grace period.`);

    // Trigger non-blocking notifications for all expired subscriptions
    if (data && data.length > 0) {
      for (const sub of data) {
        createUserNotification(
          sub.user_id,
          "Subscription Expired",
          "Your subscription has expired. Renew today to unlock GPS and battery controls.",
          "kyc"
        ).catch((err) => console.warn(`[subscriptionService.expireOldSubscriptions] notification failed for user ${sub.user_id}:`, err?.message));
      }
    }

    return data || [];
  } catch (error) {
    console.error("[subscriptionService] expireOldSubscriptions failed:", error.message);
    throw error;
  }
}

/**
 * Send warning notifications to users whose subscriptions expire in exactly 2 days
 */
export async function sendSubscriptionExpiryWarnings() {
  try {
    const now = new Date();
    // Query subscriptions ending between now and 48 hours (2 days) from now
    const targetMax = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    const { data: subs, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .neq("status", "cancelled")
      .lte("end_date", targetMax)
      .gt("end_date", now.toISOString());

    if (error) throw error;
    console.log(`[subscriptionService] Found ${subs?.length || 0} subscriptions expiring in the next 48 hours`);

    if (subs && subs.length > 0) {
      for (const sub of subs) {
        // To prevent duplicate warning notifications in a short timeframe (e.g. within 3 days),
        // we check if a subscription_warning notification was already sent to this user.
        // We query the notifications table for this user with type 'subscription_warning' in the last 3 days.
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existingNotif, error: notifError } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("type", "subscription_warning")
          .gt("created_at", threeDaysAgo)
          .limit(1);

        if (notifError) {
          console.warn(`[subscriptionService] Warning check failed for user ${sub.user_id}:`, notifError.message);
          continue;
        }

        if (existingNotif && existingNotif.length > 0) {
          // Warning already sent recently
          continue;
        }

        // Send warning notification
        await createUserNotification(
          sub.user_id,
          "Subscription Expiring Soon! ⚠️",
          "Your plan expires in 2 days. Recharge to continue riding.",
          "subscription_warning"
        );
        console.log(`[subscriptionService] Sent 2-day expiry warning to user ${sub.user_id}`);
      }
    }

    return subs || [];
  } catch (error) {
    console.error("[subscriptionService] sendSubscriptionExpiryWarnings failed:", error.message);
    throw error;
  }
}

