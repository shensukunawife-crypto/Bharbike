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
    const { amount, currency = "INR", receipt, amount_in_paise = false, user_id = null, plan_name = null, plan_id = null } = req.body;
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const normalizedAmount = amount_in_paise ? numericAmount / 100 : numericAmount;

    // Check if real Razorpay key is configured
    let config = null;
    let useRealRazorpay = false;
    try {
      config = await getActiveRazorpayConfig();
      if (config && config.key_id && config.key_secret && config.key_id.startsWith("rzp_")) {
        useRealRazorpay = true;
      }
    } catch (configError) {
      console.log("[createOrder] Active Razorpay config not found or invalid. Falling back to Demo Mode:", configError.message);
    }

    if (useRealRazorpay) {
      console.log(`[createOrder] Real Razorpay Mode Active (${config.mode})`);

      // 1. Create order record in app database first (pending)
      const { data: appOrder, error: appOrderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user_id || null,
            plan_name: plan_name || null,
            amount: Math.round(normalizedAmount),
            status: "pending",
            order_code: `ORD-RZP-${Date.now()}`,
          },
        ])
        .select("id")
        .single();

      let appOrderId = appOrder?.id ?? null;
      if (appOrderError) {
        console.error("[createOrder] database order insert failed:", appOrderError);
        // Fallback to random ID if database is missing tables or RLS blocked
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

      // 2. Initialize Razorpay Client
      const razorpay = new Razorpay({
        key_id: config.key_id,
        key_secret: config.key_secret,
      });

      // 3. Create real order on Razorpay servers
      const amountInPaise = Math.round(normalizedAmount * 100);
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: currency || "INR",
        receipt: receipt || `receipt_${appOrderId || Date.now()}`,
      });

      // 4. Save to payments table
      try {
        await supabase.from("payments").insert([
          {
            order_id: appOrderId,
            razorpay_order_id: rzpOrder.id,
            status: "created",
          },
        ]);
      } catch (paymentInsertError) {
        console.warn("[createOrder] payments insert skipped in real mode:", paymentInsertError?.message);
      }

      // 5. Return actual order details and key_id to the frontend
      return res.status(200).json({
        success: true,
        id: rzpOrder.id,
        order_id: rzpOrder.id,
        key_id: config.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || "INR",
        app_order_id: appOrderId,
        is_demo: false,
        plan_id: plan_id || plan_name || null,
      });
    }

    // DEMO MODE FALLBACK: Skip Razorpay and create a mock order
    console.log("[createOrder] DEMO MODE ACTIVE - Skipping Razorpay");
    
    const mockRazorpayOrderId = `order_demo_${Date.now()}`;

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
      // Pass through plan_id if provided (UUID from subscription_plans)
      // Fall back to plan_name so verifyPayment can look it up
      plan_id: plan_id || plan_name || null,
    });
  } catch (error) {
    console.error("[createOrder] Order creation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verifies Payment (Supports Cryptographic Signature Check & Demo Bypass)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, app_order_id, user_id, plan_id, ticket_id, payment_method, amount } = req.body;
    
    let resolvedPaymentId = `pay_demo_${Date.now()}`;
    let isDemoMode = true;

    // Cryptographic signature check if a real Razorpay signature is supplied
    if (razorpay_signature) {
      console.log("[verifyPayment] Real Razorpay signature received. Verifying...");
      try {
        const config = await getActiveRazorpayConfig();
        if (config && config.key_secret) {
          const hmac = crypto.createHmac("sha256", config.key_secret);
          hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
          const generatedSignature = hmac.digest("hex");
          
          if (generatedSignature !== razorpay_signature) {
            console.error("[verifyPayment] Cryptographic signature mismatch!");
            return res.status(400).json({ success: false, message: "Payment verification failed: Signature mismatch" });
          }
          console.log("[verifyPayment] Cryptographic signature verified successfully!");
          resolvedPaymentId = razorpay_payment_id;
          isDemoMode = false;
        } else {
          console.warn("[verifyPayment] Real signature received but no active key secret found. Falling back to Demo Mode.");
        }
      } catch (err) {
        console.error("[verifyPayment] Error retrieving key secret for verification:", err.message);
        return res.status(400).json({ success: false, message: "Verification failed: Could not load Razorpay config" });
      }
    } else {
      console.log("[verifyPayment] DEMO MODE - Auto-verifying payment");
    }

    // Check if this is a support ticket repair cost payment
    if (ticket_id) {
      if (payment_method === "wallet") {
        const costAmount = Number(amount) || 0;
        if (costAmount <= 0) {
          return res.status(400).json({ success: false, message: "Invalid payment amount for ticket" });
        }
        console.log(`[verifyPayment] Wallet payment for ticket detected. Deducting ₹${costAmount}`);
        // Deduct money from wallet
        await walletService.deductMoney(user_id, costAmount, `Repair Cost: Ticket #${ticket_id}`);
      }

      // Update ticket status in DB
      try {
        await supabase.from("support_tickets").update({ 
          payment_status: "paid",
          status: "resolved",
          updated_at: new Date().toISOString()
        }).eq("id", ticket_id);
      } catch (e) {
        console.warn("[verifyPayment] support_tickets status update failed:", e?.message);
      }

      if (app_order_id) {
        try {
          await supabase.from("orders").update({ status: "paid" }).eq("id", app_order_id);
        } catch (e) {
          console.warn("[verifyPayment] orders status update failed:", e?.message);
        }
      }

      let walletSummary = null;
      if (user_id) {
        try {
          walletSummary = await walletService.getWalletSummary(user_id);
        } catch (e) {
          console.warn("[verifyPayment] failed to get wallet summary:", e?.message);
        }
      }

      return res.json({ success: true, is_demo: isDemoMode, wallet: walletSummary });
    }

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
        .update({ status: "success", razorpay_payment_id: resolvedPaymentId })
        .eq("razorpay_order_id", razorpay_order_id)
        .select("id")
        .single();
      paymentRecordId = paymentRecord?.id ?? null;
    } catch (e) { console.warn("[verifyPayment] payments update skipped:", e?.message); }

    // Create subscription or add wallet money
    if (user_id && plan_id) {
      const subAmount = Number(amount) || 0;

      // Resolve plan display name first
      let planDisplayName = "Weekly Plan"; // Default fallback
      try {
        const { data: planRow } = await supabase
          .from("subscription_plans")
          .select("display_name")
          .or(`id.eq.${plan_id},name.eq.${plan_id}`)
          .limit(1)
          .single();
        if (planRow?.display_name) {
          planDisplayName = planRow.display_name;
        }
      } catch (planErr) {
        console.warn("[verifyPayment] plan display name lookup failed, using fallback:", planErr?.message);
        if (plan_id?.toLowerCase().includes("weekly") || plan_id === "plan_weekly") {
          planDisplayName = "Weekly Plan";
        }
      }

      // If paying via wallet, we MUST have enough balance
      if (payment_method === "wallet" && subAmount > 0) {
        console.log(`[verifyPayment] Wallet payment detected. Deducting ₹${subAmount}`);
        // Remove try-catch so AppError (Insufficient balance) propagates to the user
        await walletService.deductMoney(user_id, subAmount, `Subscription: ${planDisplayName}`);
        console.log("[verifyPayment] wallet deducted successfully");
      }

      try {
        await createSubscription(user_id, plan_id, paymentRecordId);
        console.log("[verifyPayment] subscription created via service");
      } catch (e) {
        console.warn("[verifyPayment] subscription service failed, trying direct insert:", e?.message);
        // Fallback: insert subscription directly — look up plan UUID first
        try {
          let planUuid = plan_id;
          let durationDays = 30;
          try {
            const { data: planRow } = await supabase
              .from("subscription_plans")
              .select("id, duration_days")
              .or(`name.eq.${plan_id},display_name.ilike.%${plan_id}%`)
              .limit(1)
              .single();
            if (planRow) {
              planUuid = planRow.id;
              durationDays = planRow.duration_days || 30;
            }
          } catch (planErr) {
            console.warn("[verifyPayment] plan lookup skipped:", planErr?.message);
            // BharBike only has a 7-day weekly plan — default to 7, not 30
            durationDays = plan_id?.toLowerCase().includes("month") ? 30 :
                           plan_id?.toLowerCase().includes("week") ? 7 :
                           plan_id?.toLowerCase().includes("year") ? 365 : 7;
          }

          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + durationDays);

          const { data: subData, error: subError } = await supabase.from("user_subscriptions").upsert({
            user_id,
            status: "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            plan_id: String(planUuid),
            auto_renew: false,
            created_at: startDate.toISOString(),
          }, { onConflict: "user_id" });
          if (subError) {
            console.warn("[verifyPayment] direct subscription insert failed:", subError.message);
          } else {
            console.log("[verifyPayment] direct subscription insert succeeded");
          }
        } catch (directErr) {
          console.warn("[verifyPayment] direct subscription insert also failed:", directErr?.message);
        }
      }
    } else if (user_id) {
      // Add money to wallet — try RPC first, then direct insert fallback
      let addAmount = Number(amount) || 0;

      // Fallback: If amount is missing, retrieve it from the orders table
      if (addAmount <= 0 && app_order_id) {
        try {
          const { data: orderRow } = await supabase
            .from("orders")
            .select("amount")
            .eq("id", app_order_id)
            .maybeSingle();
          if (orderRow?.amount) {
            addAmount = Number(orderRow.amount);
            console.log(`[verifyPayment] Recovered wallet amount from orders table: ₹${addAmount}`);
          }
        } catch (dbErr) {
          console.warn("[verifyPayment] Failed to recover amount from orders table:", dbErr?.message);
        }
      }

      if (addAmount > 0) {
        try {
          await walletService.addMoney(user_id, addAmount, "Wallet Recharge", resolvedPaymentId, razorpay_order_id);
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
              payment_id: resolvedPaymentId, order_id: razorpay_order_id, status: "completed"
            }).then(r => { if (r.error) console.warn("[verifyPayment] tx insert failed:", r.error.message); });
          } catch (directErr) {
            console.warn("[verifyPayment] direct wallet insert also failed:", directErr?.message);
          }
        }
      }
    }

    let walletSummary = null;
    if (user_id) {
      try {
        walletSummary = await walletService.getWalletSummary(user_id);
      } catch (e) {
        console.warn("[verifyPayment] failed to get wallet summary:", e?.message);
      }
    }

    return res.json({ success: true, is_demo: isDemoMode, wallet: walletSummary });
  } catch (error) {
    console.error("[verifyPayment] Error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
