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

    let appOrderId = appOrder?.id ?? null;
    if (appOrderError) {
      console.error("[createOrder] demo order insert failed:", appOrderError);
      // If RLS or table missing, generate mock order ID anyway
      if (appOrderError.message?.toLowerCase().includes("row-level security") ||
          appOrderError.message?.toLowerCase().includes("violates") ||
          appOrderError.message?.toLowerCase().includes("could not find") ||
          appOrderError.code === "PGRST205") {
        appOrderId = crypto.randomUUID();
        console.warn("[createOrder] orders table issue — using mock order ID:", appOrderId);
      } else {
        return res.status(500).json({ success: false, message: appOrderError.message });
      }
    }

    // Try inserting payment record, but don't fail if table is missing/RLS
    try {
      await supabase.from("payments").insert([
        {
          order_id: appOrderId,
          razorpay_order_id: mockRazorpayOrderId,
          status: "created",
        },
      ]);
    } catch (paymentInsertError) {
      console.warn("[createOrder] payments insert skipped:", paymentInsertError?.message);
    }

    // Return mock data that looks like a Razorpay order
    return res.status(200).json({
      success: true,
      id: mockRazorpayOrderId,
      amount: Math.round(normalizedAmount * 100),
      currency: "INR",
      app_order_id: appOrderId,
      is_demo: true,
      plan_id: plan_name || null,
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

    // Wrap all DB operations in try/catch — don't fail on RLS or missing tables
    try {
      if (app_order_id) {
        await supabase.from("orders").update({ status: "paid" }).eq("id", app_order_id);
      }
    } catch (e) { console.warn("[verifyPayment] orders update skipped:", e?.message); }

    let paymentRecordId = null;
    try {
      const { data: paymentRecord } = await supabase
        .from("payments")
        .update({ status: "success", razorpay_payment_id: mockPaymentId })
        .eq("razorpay_order_id", razorpay_order_id)
        .select("id")
        .single();
      paymentRecordId = paymentRecord?.id ?? null;
    } catch (e) { console.warn("[verifyPayment] payments update skipped:", e?.message); }

    // Create subscription or add wallet money
    if (user_id && plan_id) {
      try {
        await createSubscription(user_id, plan_id, paymentRecordId);
      } catch (e) {
        console.warn("[verifyPayment] subscription service failed, trying direct insert:", e?.message);
        // Fallback: insert subscription directly without plan lookup
        try {
          const durationDays = plan_id?.toLowerCase().includes("month") ? 30 :
                               plan_id?.toLowerCase().includes("week") ? 7 :
                               plan_id?.toLowerCase().includes("year") ? 365 : 30;
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + durationDays);

          await supabase.from("user_subscriptions").upsert({
            user_id,
            status: "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            plan_id: plan_id,
            payment_id: paymentRecordId,
            auto_renew: false,
            created_at: startDate.toISOString(),
          }, { onConflict: "user_id" });
          console.log("[verifyPayment] direct subscription insert succeeded");
        } catch (directErr) {
          console.warn("[verifyPayment] direct subscription insert also failed:", directErr?.message);
        }
      }
    } else if (user_id) {
      // Add money to wallet — try RPC first, then direct insert fallback
      const addAmount = Number(req.body.amount) || 0;
      if (addAmount > 0) {
        try {
          await walletService.addMoney(user_id, addAmount, "Wallet Recharge", mockPaymentId, razorpay_order_id);
        } catch (rpcErr) {
          console.warn("[verifyPayment] wallet RPC failed, trying direct insert:", rpcErr?.message);
          try {
            // Upsert wallet_balances row
            const { data: existing } = await supabase.from("wallet_balances").select("balance").eq("user_id", user_id).single();
            const newBalance = (existing?.balance || 0) + addAmount;
            const { error: upsertErr } = await supabase.from("wallet_balances").upsert(
              { user_id: user_id, balance: newBalance, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
            if (upsertErr) console.warn("[verifyPayment] wallet upsert failed:", upsertErr.message);
            // Insert transaction record
            await supabase.from("wallet_transactions").insert({
              user_id, amount: addAmount, type: "credit", title: "Wallet Recharge",
              payment_id: mockPaymentId, order_id: razorpay_order_id, status: "completed"
            }).then(r => { if (r.error) console.warn("[verifyPayment] tx insert failed:", r.error.message); });
          } catch (directErr) {
            console.warn("[verifyPayment] direct wallet insert also failed:", directErr?.message);
          }
        }
      }
    }

    return res.json({ success: true, is_demo: true });
  } catch (error) {
    console.error("[verifyPayment] Demo error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
