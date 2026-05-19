import * as subscriptionService from "../services/subscriptionService.js";
import supabase from "../utils/supabaseClient.js";

/**
 * GET /api/subscription/plans
 * Get all available subscription plans
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    return res.json({ success: true, data: plans });
  } catch (error) {
    console.error("[subscriptionController.getPlans]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch subscription plans",
    });
  }
};

/**
 * GET /api/subscription/active
 * Get user's active subscription
 */
export const getActiveSubscription = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    let subscription = null;
    try {
      subscription = await subscriptionService.getUserActiveSubscription(userId);
    } catch (e) {
      console.warn("[getActiveSubscription] service failed:", e?.message);
    }

    if (!subscription) {
      // Check if user has any subscription record even without plan join
      try {
        const { data: rawSub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["active", "cancelled"])
          .gt("end_date", new Date().toISOString())
          .order("end_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rawSub) {
          const endDate = new Date(rawSub.end_date);
          const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
          
          // Try to look up plan details by plan_id
          let planInfo = { display_name: "Active Plan", price: null, duration_days: null };
          try {
            const { data: planRow } = await supabase
              .from("subscription_plans")
              .select("display_name, name, price, duration_days")
              .eq("id", rawSub.plan_id)
              .maybeSingle();
            if (planRow) {
              planInfo = {
                display_name: planRow.display_name || planRow.name || "Active Plan",
                price: planRow.price,
                duration_days: planRow.duration_days,
              };
            }
          } catch { /* plan table may not exist yet */ }

          return res.json({
            success: true,
            data: {
              ...rawSub,
              plan: planInfo,
              days_remaining: daysRemaining,
            },
          });
        }
      } catch (e2) {
        console.warn("[getActiveSubscription] direct query also failed:", e2?.message);
      }

      return res.json({ success: true, data: null, message: "No active subscription" });
    }

    // Calculate days remaining
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return res.json({
      success: true,
      data: {
        ...subscription,
        days_remaining: daysRemaining,
      },
    });
  } catch (error) {
    console.error("[subscriptionController.getActiveSubscription]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active subscription",
    });
  }
};

/**
 * GET /api/subscription/history
 * Get user's subscription history
 */
export const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    return res.json({ success: true, data: subscriptions });
  } catch (error) {
    console.error("[subscriptionController.getSubscriptionHistory]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch subscription history",
    });
  }
};

/**
 * GET /api/subscription/billing
 * Get user's billing history
 */
export const getBillingHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const billingHistory = await subscriptionService.getUserBillingHistory(userId, limit);
    return res.json({ success: true, data: billingHistory });
  } catch (error) {
    console.error("[subscriptionController.getBillingHistory]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch billing history",
    });
  }
};

/**
 * POST /api/subscription/create
 * Create a new subscription after successful payment
 */
export const createSubscription = async (req, res) => {
  try {
    const { user_id, plan_id, payment_id } = req.body;

    if (!user_id || !plan_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and plan_id are required",
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await subscriptionService.getUserActiveSubscription(user_id);
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: "User already has an active subscription",
        data: existingSubscription,
      });
    }

    const subscription = await subscriptionService.createSubscription(
      user_id,
      plan_id,
      payment_id
    );

    return res.status(201).json({
      success: true,
      data: subscription,
      message: "Subscription created successfully",
    });
  } catch (error) {
    console.error("[subscriptionController.createSubscription]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create subscription",
    });
  }
};

/**
 * POST /api/subscription/cancel
 * Cancel user's active subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { user_id, subscription_id, reason } = req.body;

    if (!user_id || !subscription_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and subscription_id are required",
      });
    }

    const subscription = await subscriptionService.cancelSubscription(
      user_id,
      subscription_id,
      reason
    );

    return res.json({
      success: true,
      data: subscription,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("[subscriptionController.cancelSubscription]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel subscription",
    });
  }
};

/**
 * PATCH /api/subscription/auto-renew
 * Update auto-renew setting
 */
export const updateAutoRenew = async (req, res) => {
  try {
    const { user_id, subscription_id, auto_renew } = req.body;

    if (!user_id || !subscription_id || typeof auto_renew !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "user_id, subscription_id, and auto_renew (boolean) are required",
      });
    }

    const subscription = await subscriptionService.updateAutoRenew(
      user_id,
      subscription_id,
      auto_renew
    );

    return res.json({
      success: true,
      data: subscription,
      message: `Auto-renew ${auto_renew ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    console.error("[subscriptionController.updateAutoRenew]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update auto-renew setting",
    });
  }
};

/**
 * GET /api/subscription/check
 * Check if user has active subscription
 */
export const checkSubscription = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const hasActive = await subscriptionService.hasActiveSubscription(userId);
    return res.json({
      success: true,
      has_active_subscription: hasActive,
    });
  } catch (error) {
    console.error("[subscriptionController.checkSubscription]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check subscription status",
    });
  }
};
