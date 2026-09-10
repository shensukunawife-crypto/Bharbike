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
    // SECURITY FIX: Always use authenticated user ID, never trust query params
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    let subscription = null;
    try {
      subscription = await subscriptionService.getUserActiveSubscription(userId);
    } catch (e) {
      console.warn("[getActiveSubscription] service failed:", e?.message);
    }

    // Fetch any overdue dues for inactive / penalty calculation
    let dues = { isInactive: false, subStatus: "none", daysSinceInactive: 0, overdueAmount: 0, dailyRate: 278.57, reason: "" };
    try {
      dues = await subscriptionService.calculateUserOverdueDues(userId);
      // If user has outstanding overdue dues, ensure they receive an in-app notification
      if (dues.isInactive && dues.overdueAmount > 0) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "overdue_dues")
          .gt("created_at", oneDayAgo)
          .limit(1);

        if (!existingNotifs || existingNotifs.length === 0) {
          const { createUserNotification } = await import("../services/notificationService.js");
          await createUserNotification(
            userId,
            "⚠️ Outstanding Dues Notice",
            `You have ₹${dues.overdueAmount} pending dues (${dues.daysSinceInactive} days overdue). Please clear your dues or contact admin.`,
            "overdue_dues"
          ).catch(() => {});
        }
      }
    } catch (dueErr) {
      console.warn("[getActiveSubscription] dues calculation error:", dueErr?.message);
    }

    if (!subscription) {
      // Check if user has any subscription record even without plan join
      try {
        const { data: rawSub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", userId)
          .neq("status", "cancelled")
          .gt("end_date", new Date().toISOString())
          .order("end_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rawSub) {
          const endDate = new Date(rawSub.end_date);
          const now = new Date();
          // Calculate inclusive calendar days remaining in IST
          const _endIST = new Date(endDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const _nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const endMidnight = new Date(_endIST.getFullYear(), _endIST.getMonth(), _endIST.getDate());
          const nowMidnight = new Date(_nowIST.getFullYear(), _nowIST.getMonth(), _nowIST.getDate());
          const diffDays = Math.round((endMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, diffDays + 1);
          
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

          const isPastEnd = endDate < now;
          const canRenew = isPastEnd || daysRemaining <= 2;

          return res.json({
            success: true,
            data: {
              ...rawSub,
              // When canRenew is true (Day 6, Day 7, or overnight grace), set plan_id to null so the mobile
              // app's subscription-plans.tsx does not disable the "Select Plan" button, allowing seamless renewal!
              plan_id: canRenew ? null : rawSub.plan_id,
              current_plan_id: rawSub.plan_id,
              status: isPastEnd ? "expired" : rawSub.status,
              end_date: rawSub.end_date ? new Date(new Date(rawSub.end_date).getTime() - 1000).toISOString() : rawSub.end_date,
              plan: planInfo,
              days_remaining: daysRemaining,
              can_renew: canRenew,
              is_renewal_window: canRenew,
              is_in_grace: isPastEnd,
            },
            pending_amount: dues.overdueAmount || 0,
            days_overdue: dues.daysSinceInactive || 0,
            is_inactive: dues.isInactive,
          });
        }
      } catch (e2) {
        console.warn("[getActiveSubscription] direct query also failed:", e2?.message);
      }

      return res.json({
        success: true,
        data: null,
        message: dues.overdueAmount > 0 ? `Pending dues: ₹${dues.overdueAmount}` : "No active subscription",
        pending_amount: dues.overdueAmount || 0,
        days_overdue: dues.daysSinceInactive || 0,
        is_inactive: dues.isInactive,
      });
    }

    // Calculate inclusive calendar days remaining in IST
    const endDate = new Date(subscription.end_date);
    const now = new Date();
    const _endIST = new Date(endDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const _nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const endMidnight = new Date(_endIST.getFullYear(), _endIST.getMonth(), _endIST.getDate());
    const nowMidnight = new Date(_nowIST.getFullYear(), _nowIST.getMonth(), _nowIST.getDate());
    const diffDays = Math.round((endMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, diffDays + 1);
    const isPastEnd = endDate < now;
    const canRenew = isPastEnd || daysRemaining <= 2;

    return res.json({
      success: true,
      data: {
        ...subscription,
        // When canRenew is true (Day 6, Day 7, or overnight grace), set plan_id to null so the mobile
        // app's subscription-plans.tsx does not disable the "Select Plan" button, allowing seamless renewal!
        plan_id: canRenew ? null : subscription.plan_id,
        current_plan_id: subscription.plan_id,
        status: isPastEnd ? "expired" : subscription.status,
        end_date: subscription.end_date ? new Date(new Date(subscription.end_date).getTime() - 1000).toISOString() : subscription.end_date,
        days_remaining: daysRemaining,
        can_renew: canRenew,
        is_renewal_window: canRenew,
        is_in_grace: isPastEnd,
      },
      pending_amount: dues.overdueAmount || 0,
      days_overdue: dues.daysSinceInactive || 0,
      is_inactive: dues.isInactive,
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
    // SECURITY FIX: Always use authenticated user ID
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    const adjustedSubs = subscriptions.map(sub => ({
      ...sub,
      end_date: sub.end_date ? new Date(new Date(sub.end_date).getTime() - 1000).toISOString() : sub.end_date
    }));
    return res.json({ success: true, data: adjustedSubs });
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
    // SECURITY FIX: Always use authenticated user ID
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
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
 * Create a new subscription — REQUIRES a verified payment_id from a successful Razorpay payment
 */
export const createSubscription = async (req, res) => {
  try {
    // SECURITY FIX: Use authenticated user ID, not body user_id
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { plan_id, payment_id, amount } = req.body;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: "plan_id is required",
      });
    }

    // SECURITY FIX: Require a verified payment_id — verify it exists in payments table with status=success
    if (!payment_id) {
      return res.status(400).json({
        success: false,
        message: "payment_id is required. Please complete payment first.",
      });
    }

    // Verify payment exists and belongs to this user with success status
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, user_id, amount")
      .eq("razorpay_payment_id", payment_id)
      .maybeSingle();

    if (paymentError || !paymentRecord) {
      console.warn("[createSubscription] payment_id not found:", payment_id);
      return res.status(400).json({
        success: false,
        message: "Invalid payment. Please complete a valid payment first.",
      });
    }

    if (paymentRecord.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been verified yet. Please try again.",
      });
    }

    // Ensure payment belongs to THIS user
    if (paymentRecord.user_id && paymentRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Payment does not belong to this user.",
      });
    }

    // Check if user already has active subscription
    const existingSubscription = await subscriptionService.getUserActiveSubscription(userId);
    if (existingSubscription) {
      const endDate = new Date(existingSubscription.end_date);
      const now = new Date();
      const _endIST = new Date(endDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const _nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const endMidnight = new Date(_endIST.getFullYear(), _endIST.getMonth(), _endIST.getDate());
      const nowMidnight = new Date(_nowIST.getFullYear(), _nowIST.getMonth(), _nowIST.getDate());
      const diffDays = Math.round((endMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, diffDays + 1);
      const isPastEnd = endDate < now;

      // Allow renewal on Day 6 & 7 (daysRemaining <= 2) or during overnight grace before 9:30 AM (isPastEnd)
      const canRenew = isPastEnd || daysRemaining <= 2;

      if (!canRenew) {
        return res.status(400).json({
          success: false,
          message: `Your subscription is currently active with ${daysRemaining} days remaining. Early renewal opens on Day 6 (2 days before expiry).`,
          data: existingSubscription,
        });
      }
      console.log(`[createSubscription] Renewal permitted for user ${userId} (daysRemaining: ${daysRemaining}, isPastEnd: ${isPastEnd})`);
    }

    const subscription = await subscriptionService.createSubscription(
      userId,
      plan_id,
      payment_id,
      amount || paymentRecord.amount
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
    // SECURITY FIX: Use authenticated user ID, not body user_id
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { subscription_id, reason } = req.body;

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        message: "subscription_id is required",
      });
    }

    // Verify this subscription belongs to the authenticated user
    const { data: subRecord } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("id", subscription_id)
      .maybeSingle();

    if (!subRecord || subRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Subscription not found or does not belong to this user.",
      });
    }

    const subscription = await subscriptionService.cancelSubscription(
      userId,
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
 * Update auto-renew setting — DOES NOT change subscription status
 */
export const updateAutoRenew = async (req, res) => {
  try {
    // SECURITY FIX: Use authenticated user ID, not body user_id
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { subscription_id, auto_renew } = req.body;

    if (!subscription_id || typeof auto_renew !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "subscription_id and auto_renew (boolean) are required",
      });
    }

    // Verify this subscription belongs to the authenticated user
    const { data: subRecord } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("id", subscription_id)
      .maybeSingle();

    if (!subRecord || subRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Subscription not found or does not belong to this user.",
      });
    }

    const subscription = await subscriptionService.updateAutoRenew(
      userId,
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
    // SECURITY FIX: Use authenticated user ID
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
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
