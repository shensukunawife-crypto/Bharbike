import supabase from "../utils/supabaseClient.js";
import { createUserNotification } from "./notificationService.js";

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
export async function getSubscriptionPlanById(planId) {
  try {
    // Try UUID lookup first
    let { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    // If not found, try by name (payment flow may pass plan name as plan_id)
    if (error || !data) {
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
    const now = new Date();
    // Add 6 hour grace period for expiration to handle timezone shifts/delays
    const graceThreshold = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("user_id", userId)
      .in("status", ["active", "cancelled"])
      .gt("end_date", graceThreshold)
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
        .in("status", ["active", "cancelled"])
        .gt("end_date", graceThreshold)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rawData) {
        let planData = null;
        try {
          planData = await getSubscriptionPlanById(rawData.plan_id);
        } catch {}
        return { ...rawData, plan: planData || { display_name: "Active Plan" } };
      }
      
      if (isDatabaseError(error) || isDatabaseError(rawError)) {
        return mockSubscriptionsDB.get(userId) || null;
      }
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
export async function createSubscription(userId, planId, paymentId = null, paidAmount = null) {
  try {
    // Get plan details
    const plan = await getSubscriptionPlanById(planId);
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    if (plan.duration_days === 7) {
      // Weekly Plan: 7 days + 12 hours, then snap to 9:00 AM IST (3:30 AM UTC) of that day or the next day
      const baseMs = startDate.getTime() + (7 * 24 + 12) * 60 * 60 * 1000;
      const baseDate = new Date(baseMs);
      
      // 9:00 AM IST is 3:30 AM UTC
      const cutoffHours = 3;
      const cutoffMinutes = 30;
      
      // Compare the UTC time of baseDate with 03:30 UTC
      const baseUTCMinutesOfDay = baseDate.getUTCHours() * 60 + baseDate.getUTCMinutes();
      const cutoffUTCMinutesOfDay = cutoffHours * 60 + cutoffMinutes;
      
      if (baseUTCMinutesOfDay > cutoffUTCMinutesOfDay) {
        // If past 3:30 AM UTC, expire on the next day at 3:30 AM UTC (9:00 AM IST)
        baseDate.setUTCDate(baseDate.getUTCDate() + 1);
      }
      baseDate.setUTCHours(cutoffHours, cutoffMinutes, 0, 0);
      endDate.setTime(baseDate.getTime());
    } else {
      endDate.setDate(endDate.getDate() + plan.duration_days);
    }

    // Create subscription
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert([
        {
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: false,
        },
      ])
      .select("*")
      .single();

    if (!error && data) {
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
        billingData.razorpay_order_id = payment.razorpay_order_id;
        billingData.razorpay_payment_id = payment.razorpay_payment_id;
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
    const { data, error } = await supabase
      .from("user_subscriptions")
      .update({ status: "expired" })
      .in("status", ["active", "cancelled"])
      .lt("end_date", new Date().toISOString())
      .select();

    if (error) throw error;
    console.log(`[subscriptionService] Expired ${data?.length || 0} subscriptions`);

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
      .in("status", ["active", "cancelled"])
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

