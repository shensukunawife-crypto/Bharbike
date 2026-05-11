import supabase from "../utils/supabaseClient.js";

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

    if (error) throw error;
    return data || [];
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

    if (error) throw error;
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
      .eq("status", "active")
      .gt("end_date", new Date().toISOString())
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Join may fail if plan_id is not a valid UUID — try without join
      const { data: rawData, error: rawError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rawError) throw rawError;
      if (rawData) {
        // Try to look up plan separately
        let planData = null;
        try {
          const planLookup = await getSubscriptionPlanById(rawData.plan_id);
          if (planLookup) planData = planLookup;
        } catch {}
        return { ...rawData, plan: planData || { display_name: rawData.plan_id, price: 0 } };
      }
      return null;
    }
    return data;
  } catch (error) {
    console.error("[subscriptionService] getUserActiveSubscription failed:", error.message);
    throw error;
  }
}

/**
 * Get all user subscriptions (active and past)
 */
export async function getUserSubscriptions(userId) {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
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
          payment_id: paymentId,
          auto_renew: false,
        },
      ])
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .single();

    if (error) throw error;

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
      .single();

    if (error) throw error;
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
      .select(`
        *,
        subscription:user_subscriptions(
          plan:subscription_plans(display_name)
        )
      `)
      .eq("user_id", userId)
      .order("billing_date", { ascending: false })
      .limit(limit);

    if (error) throw error;
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

    if (error) throw error;
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
    const { data, error } = await supabase
      .from("user_subscriptions")
      .update({ auto_renew: autoRenew })
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
      .eq("status", "active")
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
