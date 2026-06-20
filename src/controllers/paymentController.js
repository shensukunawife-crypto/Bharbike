import Razorpay from "razorpay";
import crypto from "crypto";
import { getActivePaymentConfig } from "../services/paymentConfigService.js";
import { createPhonePeOrder, verifyPhonePeSignature } from "../services/phonepeService.js";
import { createSubscription } from "../services/subscriptionService.js";
import * as walletService from "../services/walletService.js";
import supabase from "../utils/supabaseClient.js";

/**
 * Creates a new Razorpay order using active keys from Supabase or ENV.
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, amount_in_paise = false, user_id = null, plan_name = null, plan_id = null, payment_method = null } = req.body;
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const normalizedAmount = amount_in_paise ? numericAmount / 100 : numericAmount;

    // Check if the user is prepaid (offline paid)
    if (user_id) {
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("is_prepaid")
          .eq("id", user_id)
          .maybeSingle();

        if (userProfile && userProfile.is_prepaid) {
          console.log(`[createOrder] User ${user_id} is marked as prepaid. Bypassing Razorpay order creation.`);
          const mockOrderId = `bypass_order_${Date.now()}`;
          return res.status(200).json({
            success: true,
            id: mockOrderId,
            order_id: mockOrderId,
            key_id: "bypass",
            amount: Math.round(normalizedAmount * 100),
            currency: currency || "INR",
            app_order_id: mockOrderId,
            is_prepaid: true,
            plan_id: plan_id || plan_name || null,
          });
        }
      } catch (err) {
        console.warn("[createOrder] prepaid status check failed:", err.message);
      }
    }

    // Check if payment method is wallet
    if (payment_method === "wallet") {
      if (user_id) {
        try {
          const { data: walletBal } = await supabase
            .from("wallet_balances")
            .select("balance")
            .eq("user_id", user_id)
            .maybeSingle();

          const balance = walletBal ? Number(walletBal.balance || 0) : 0;
          if (balance < normalizedAmount) {
            return res.status(400).json({
              success: false,
              message: `Insufficient wallet balance. You have ₹${balance}, but need ₹${normalizedAmount}. Please recharge your wallet.`
            });
          }
        } catch (err) {
          console.warn("[createOrder] wallet balance check failed:", err.message);
        }
      }

      // Create order in app database first (pending)
      const { data: appOrder, error: appOrderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user_id || null,
            plan_name: plan_name || null,
            amount: Math.round(normalizedAmount),
            status: "pending",
            order_code: `ORD-WLT-${Date.now()}`,
          },
        ])
        .select("id")
        .maybeSingle();

      let appOrderId = appOrder?.id ?? crypto.randomUUID();
      const mockOrderId = `wallet_order_${Date.now()}`;

      // Save to payments table
      try {
        await supabase.from("payments").insert([
          {
            user_id: user_id || null,
            order_id: appOrderId,
            razorpay_order_id: mockOrderId,
            status: "created",
          },
        ]);
      } catch (paymentInsertError) {
        console.warn("[createOrder] wallet payments insert skipped:", paymentInsertError?.message);
      }

      return res.status(200).json({
        success: true,
        id: mockOrderId,
        order_id: mockOrderId,
        key_id: "wallet",
        amount: Math.round(normalizedAmount * 100),
        currency: currency || "INR",
        app_order_id: appOrderId,
        payment_method: "wallet",
        plan_id: plan_id || plan_name || null,
      });
    }

    // Retrieve active gateway config (must be real keys)
    const config = await getActivePaymentConfig();
    if (!config || !config.key_id || !config.key_secret) {
      return res.status(500).json({ success: false, message: "Payment gateway is not configured on this server." });
    }

    console.log(`[createOrder] Real ${config.provider} Mode Active (${config.mode})`);

    // 1. Create order record in app database first (pending)
    const { data: appOrder, error: appOrderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: user_id || null,
          plan_name: plan_name || null,
          amount: Math.round(normalizedAmount),
          status: "pending",
          order_code: `ORD-PG-${Date.now()}`,
        },
      ])
      .select("id")
      .maybeSingle();

    let appOrderId = appOrder?.id ?? null;
    if (appOrderError || !appOrderId) {
      console.error("[createOrder] database order insert failed:", appOrderError);
      return res.status(500).json({ success: false, message: "Failed to create order. Please try again." });
    }

    let pgOrderId, pgResponse;

    if (config.provider === 'phonepe') {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const callbackUrl = `${protocol}://${host}/api/payment/phonepe/callback`;

      const ppResponse = await createPhonePeOrder(config, {
        amount: normalizedAmount,
        orderId: String(appOrderId),
        userId: user_id,
        mobileNumber: '9999999999', // PhonePe typically needs this
        callbackUrl
      });
      pgOrderId = ppResponse.provider_order_id;
      pgResponse = {
        success: true,
        id: pgOrderId,
        order_id: pgOrderId,
        key_id: config.key_id,
        amount: normalizedAmount * 100,
        currency: currency || "INR",
        app_order_id: appOrderId,
        is_demo: false,
        plan_id: plan_id || plan_name || null,
        redirect_url: ppResponse.url,
        provider: "phonepe"
      };
    } else {
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
        receipt: receipt || String(appOrderId || Date.now()),
      });
      
      pgOrderId = rzpOrder.id;
      pgResponse = {
        success: true,
        id: pgOrderId,
        order_id: pgOrderId,
        key_id: config.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || "INR",
        app_order_id: appOrderId,
        is_demo: false,
        plan_id: plan_id || plan_name || null,
        provider: "razorpay"
      };
    }

    // 4. Save to payments table
    try {
      await supabase.from("payments").insert([
        {
          user_id: user_id || null,
          order_id: appOrderId,
          razorpay_order_id: pgOrderId,
          status: "created",
        },
      ]);
    } catch (paymentInsertError) {
      console.warn("[createOrder] payments insert skipped:", paymentInsertError?.message);
    }

    // 5. Return actual order details and key_id to the frontend
    return res.status(200).json(pgResponse);

  } catch (error) {
    console.error("[createOrder] Order creation error:", error);
    const errorMessage = error?.message || 
                         error?.error?.description || 
                         (typeof error === "string" ? error : null) || 
                         "Server temporarily unavailable";
    return res.status(500).json({ success: false, message: errorMessage });
  }
};

/**
 * Verifies Payment (Supports Cryptographic Signature Check)
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, app_order_id, user_id, plan_id, ticket_id, payment_method, amount } = req.body;
    
    let resolvedPaymentId = razorpay_payment_id;

    if (razorpay_signature === "bypass_signature" && razorpay_payment_id === "bypass_payment_id") {
      console.log(`[verifyPayment] Bypass request received for user ${user_id}`);
      // Security Check: Verify in database that the user is actually marked as prepaid
      if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID is required for verification" });
      }
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("is_prepaid")
        .eq("id", user_id)
        .maybeSingle();

      if (!userProfile || !userProfile.is_prepaid) {
        console.error("[verifyPayment] Security Check Failed: User is not marked as prepaid in DB");
        return res.status(403).json({ success: false, message: "Unauthorized payment bypass request." });
      }

      resolvedPaymentId = `bypass_${Date.now()}`;

      // Reset the prepaid flag so they can't reuse it
      try {
        await supabase.from("profiles").update({ is_prepaid: false }).eq("id", user_id);
      } catch (err) {
        console.warn("[verifyPayment] Failed to reset is_prepaid flag:", err.message);
      }
    } else if (payment_method === "wallet") {
      // Wallet payments do not use Razorpay
      resolvedPaymentId = `wallet_${Date.now()}`;
    } else {
      // Direct payment via Razorpay gateway — MUST verify signature
      if (!razorpay_signature || !razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ success: false, message: "Cryptographic signature and order/payment IDs are required for verification" });
      }

      console.log("[verifyPayment] Signature received. Verifying...");
      const config = await getActivePaymentConfig();
      if (!config || !config.key_secret) {
        return res.status(500).json({ success: false, message: "Payment configuration not found on this server." });
      }

      if (config.provider !== "phonepe") {
        const hmac = crypto.createHmac("sha256", config.key_secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");
        
        if (generatedSignature !== razorpay_signature) {
          console.error("[verifyPayment] Cryptographic signature mismatch!");
          return res.status(400).json({ success: false, message: "Payment verification failed: Signature mismatch" });
        }
        console.log("[verifyPayment] Cryptographic signature verified successfully!");
      } else {
         console.log("[verifyPayment] PhonePe verification is handled via Webhook.");
      }
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
        const { error: ticketUpdateError } = await supabase.from("support_tickets").update({ 
          payment_status: "paid",
          status: "resolved",
          updated_at: new Date().toISOString()
        }).eq("id", ticket_id);

        if (ticketUpdateError) {
          console.error("[verifyPayment] support_tickets status update failed:", ticketUpdateError);
          return res.status(500).json({ success: false, message: "Database update failed: " + ticketUpdateError.message });
        }
      } catch (e) {
        console.error("[verifyPayment] support_tickets status update exception:", e);
        return res.status(500).json({ success: false, message: "Internal server error updating ticket: " + e.message });
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

      return res.json({ success: true, is_demo: false, wallet: walletSummary });
    }

    const markOrderAndPaymentAsPaid = async () => {
      // Wrap all DB operations in try/catch — don't fail on RLS or missing tables
      try {
        if (app_order_id) {
          await supabase.from("orders").update({ status: "paid" }).eq("id", app_order_id);
        }
      } catch (e) { console.warn("[verifyPayment] orders update skipped:", e?.message); }

      let recordId = null;
      try {
        const query = supabase
          .from("payments")
          .update({ status: "success", razorpay_payment_id: resolvedPaymentId });
          
        if (razorpay_order_id && razorpay_order_id !== "bypass_order_id") {
          query.eq("razorpay_order_id", razorpay_order_id);
        } else if (app_order_id) {
          query.eq("order_id", app_order_id);
        } else {
          throw new Error("No valid identifier for payments update");
        }
        
        const { data: paymentRecord } = await query.select("id");
        recordId = paymentRecord?.[0]?.id ?? null;
      } catch (e) { console.warn("[verifyPayment] payments update skipped:", e?.message); }
      
      return recordId;
    };

    let paymentRecordId = null;
    if (payment_method !== "wallet") {
      // For Razorpay, payment is already verified via HMAC. Mark as paid immediately.
      paymentRecordId = await markOrderAndPaymentAsPaid();
    }

    // Create subscription or add wallet money
    if (user_id && plan_id) {
      // Resolve plan display name and PRICE from DB — never trust client-supplied amount for security
      let planDisplayName = "Weekly Plan"; // Default fallback
      let serverSidePrice = Number(amount) || 0; // Start with client amount, then override with DB price
      try {
        const { data: planRow } = await supabase
          .from("subscription_plans")
          .select("display_name, price")
          .or(`id.eq.${plan_id},name.eq.${plan_id}`)
          .limit(1)
          .maybeSingle();
        if (planRow?.display_name) {
          planDisplayName = planRow.display_name;
        }
        // SECURITY FIX: Use server-side price from DB, not client-supplied amount
        if (planRow?.price && Number(planRow.price) > 0) {
          serverSidePrice = Number(planRow.price);
          console.log(`[verifyPayment] Using server-side plan price: ₹${serverSidePrice} (client sent: ₹${amount})`);
        }
      } catch (planErr) {
        console.warn("[verifyPayment] plan lookup failed, using client amount as fallback:", planErr?.message);
        if (plan_id?.toLowerCase().includes("weekly") || plan_id === "plan_weekly") {
          planDisplayName = "Weekly Plan";
          serverSidePrice = serverSidePrice || 1950; // Known weekly price as last resort
        }
      }

      const subAmount = serverSidePrice;

      // If paying via wallet, we MUST deduct the server-verified plan price (not client amount)
      if (payment_method === "wallet") {
        if (subAmount <= 0) {
          console.warn("[verifyPayment] Wallet payment blocked: plan price is 0 or could not be determined");
          return res.status(400).json({ success: false, message: "Could not determine plan price. Please try again." });
        }
        console.log(`[verifyPayment] Wallet payment detected. Deducting ₹${subAmount}`);
        await walletService.deductMoney(user_id, subAmount, `Subscription: ${planDisplayName}`);
        console.log("[verifyPayment] wallet deducted successfully");
        
        // NOW mark the wallet order as paid (since deduction succeeded atomically)
        paymentRecordId = await markOrderAndPaymentAsPaid();
      }

      try {
        await createSubscription(user_id, plan_id, paymentRecordId, subAmount);
        console.log("[verifyPayment] subscription created via service");
      } catch (e) {
        console.warn("[verifyPayment] subscription service failed, trying direct insert:", e?.message);
        // Fallback: insert subscription directly
        try {
          let planUuid = plan_id;
          let durationDays = 30;
          try {
            const { data: planRow } = await supabase
              .from("subscription_plans")
              .select("id, duration_days")
              .or(`name.eq.${plan_id},display_name.ilike.%${plan_id}%`)
              .limit(1)
              .maybeSingle();
            if (planRow) {
              planUuid = planRow.id;
              durationDays = planRow.duration_days || 30;
            }
          } catch (planErr) {
            console.warn("[verifyPayment] plan lookup skipped:", planErr?.message);
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
            const { data: existing } = await supabase.from("wallet_balances").select("balance").eq("user_id", user_id).maybeSingle();
            const newBalance = (existing?.balance || 0) + addAmount;
            const { error: upsertErr } = await supabase.from("wallet_balances").upsert(
              { user_id: user_id, balance: newBalance, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
            if (upsertErr) console.warn("[verifyPayment] wallet upsert failed:", upsertErr.message);
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

    return res.json({ success: true, is_demo: false, wallet: walletSummary });
  } catch (error) {
    console.error("[verifyPayment] Error:", error);
    const errorMessage = error?.message || 
                         error?.error?.description || 
                         (typeof error === "string" ? error : null) || 
                         "Payment verification failed";
    return res.status(error.statusCode || 500).json({ success: false, message: errorMessage });
  }
};
