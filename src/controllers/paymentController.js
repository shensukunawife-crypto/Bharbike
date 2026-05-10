import Razorpay from "razorpay";
import crypto from "crypto";
import { getActiveRazorpayConfig } from "../services/paymentConfigService.js";
import { createSubscription } from "../services/subscriptionService.js";
import * as walletService from "../services/walletService.js";
import supabase from "../utils/supabaseClient.js";

/**
 * Creates a new Razorpay order using active keys from Supabase or ENV.
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, amount_in_paise = false, user_id = null, plan_name = null, is_demo = true } = req.body;
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    
    // DEMO MODE: Skip Razorpay and create a mock order
    console.log("[createOrder] DEMO MODE ACTIVE - Skipping Razorpay");
    
    const mockRazorpayOrderId = `order_demo_${Date.now()}`;
    const normalizedAmount = amount_in_paise ? numericAmount / 100 : numericAmount;

    const { data: appOrder, error: appOrderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: user_id || null,
          plan_name: plan_name || null,
          amount: Math.round(normalizedAmount),
          status: "pending",
          order_code: `ORD-DEMO-${Date.now()}`,
        },
      ])
      .select("id")
      .single();

    if (appOrderError) {
      console.error("[createOrder] demo order insert failed:", appOrderError);
      return res.status(500).json({ success: false, message: appOrderError.message });
    }

    const { error: paymentInsertError } = await supabase.from("payments").insert([
      {
        order_id: appOrder.id,
        razorpay_order_id: mockRazorpayOrderId,
        status: "created",
      },
    ]);

    if (paymentInsertError) {
      return res.status(500).json({ success: false, message: paymentInsertError.message });
    }

    // Return mock data that looks like a Razorpay order
    return res.status(200).json({
      success: true,
      id: mockRazorpayOrderId,
      amount: Math.round(normalizedAmount * 100),
      currency: "INR",
      app_order_id: appOrder.id,
      is_demo: true
    });
  } catch (error) {
    console.error("[createOrder] Demo error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verifies Payment (Modified for Demo Mode)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, app_order_id, user_id, plan_id } = req.body;
    const mockPaymentId = `pay_demo_${Date.now()}`;

    console.log("[verifyPayment] DEMO MODE - Auto-verifying payment");

    if (app_order_id) {
      await supabase.from("orders").update({ status: "paid" }).eq("id", app_order_id);
    }

    const { data: paymentRecord } = await supabase
      .from("payments")
      .update({ status: "success", razorpay_payment_id: mockPaymentId })
      .eq("razorpay_order_id", razorpay_order_id)
      .select("id")
      .single();

    // Create subscription or add wallet money
    if (user_id && plan_id) {
      await createSubscription(user_id, plan_id, paymentRecord?.id);
    } else if (user_id && app_order_id) {
      const { data: orderData } = await supabase.from("orders").select("amount, plan_name").eq("id", app_order_id).single();
      if (orderData?.amount) {
        await walletService.addMoney(user_id, orderData.amount, orderData.plan_name || "Wallet Recharge", mockPaymentId, razorpay_order_id);
      }
    }

    return res.json({ success: true, is_demo: true });
  } catch (error) {
    console.error("[verifyPayment] Demo error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
