import supabase from "../utils/supabaseClient.js";

const MOCK_PLANS = [
  {
    id: "plan_weekly",
    name: "weekly_plan",
    display_name: "Weekly Plan",
    description: "Full access to BharBike fleet for 7 days.",
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
export async function createSubscription(userId, planId, paymentId = null) {
  try {
    // Get plan details
    const plan = await getSubscriptionPlanById(planId);
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

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
        return mockSub;
      }
      throw error;
    }

    // Create billing record
    await createBillingRecord(data.id, userId, plan.price, "paid", paymentId);

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
    return data || [];
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
    const updateData = { auto_renew: autoRenew };
    if (autoRenew) {
      updateData.status = "active";
      updateData.cancelled_at = null;
      updateData.cancellation_reason = null;
    } else {
      updateData.status = "cancelled";
      updateData.cancelled_at = new Date().toISOString();
    }

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
    return data || [];
  } catch (error) {
    console.error("[subscriptionService] expireOldSubscriptions failed:", error.message);
    throw error;
  }
}
