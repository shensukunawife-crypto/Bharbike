import Razorpay from "razorpay";
import crypto from "crypto";
import { getActiveRazorpayConfig } from "../services/paymentConfigService.js";
import supabase from "../utils/supabaseClient.js";

/**
 * Creates a new Razorpay order using active keys from Supabase or ENV.
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, amount_in_paise = false, user_id = null, plan_name = null } = req.body;
    const config = await getActiveRazorpayConfig();
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    const finalAmount = amount_in_paise ? Math.round(numericAmount) : Math.round(numericAmount * 100);

    const options = {
      amount: finalAmount,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const razorpay = new Razorpay({
      key_id: config.key_id,
      key_secret: config.key_secret,
    });
    const order = await razorpay.orders.create(options);

    const normalizedAmount = Number(order.amount) / 100;
    const { data: appOrder, error: appOrderError } = await supabase
      .from("orders")
      .insert([
        {
          user_id: user_id || null,
          plan_name: plan_name || null,
          amount: Number.isFinite(normalizedAmount) ? Math.round(normalizedAmount) : null,
          status: "pending",
          order_code: `ORD-${Date.now()}`,
        },
      ])
      .select("id")
      .single();
    if (appOrderError) {
      console.error("[createOrder] app order insert failed:", appOrderError);
      return res.status(500).json({
        success: false,
        message: appOrderError.message,
        error: appOrderError.message,
        code: "ORDER_DB_INSERT_FAILED",
      });
    }

    const { error: paymentInsertError } = await supabase.from("payments").insert([
      {
        order_id: appOrder.id,
        razorpay_order_id: order.id,
        status: "created",
      },
    ]);
    if (paymentInsertError) {
      console.error("[createOrder] payment insert failed:", paymentInsertError);
      return res.status(500).json({
        success: false,
        message: paymentInsertError.message,
        error: paymentInsertError.message,
        code: "PAYMENT_DB_INSERT_FAILED",
      });
    }

    return res.status(200).json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.key_id,
      app_order_id: appOrder.id,
    });
  } catch (error) {
    console.error("[createOrder]", {
      statusCode: error?.statusCode,
      code: error?.error?.code || error?.code,
      description: error?.error?.description || error?.description || error?.message,
    });
    const errorMessage = error?.error?.description || error?.description || error?.message || "Order creation failed";
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorMessage,
      code: error?.error?.code || error?.code || "ORDER_CREATE_FAILED",
    });
  }
};

/**
 * Verifies Razorpay payment signature.
 */
export const verifyPayment = async (req, res) => {
  try {
    const razorpay_order_id = String(req.body?.razorpay_order_id ?? "").trim();
    const razorpay_payment_id = String(req.body?.razorpay_payment_id ?? "").trim();
    const razorpay_signature = String(req.body?.razorpay_signature ?? "").trim();

    const config = await getActiveRazorpayConfig();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const payload = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto.createHmac("sha256", config.key_secret).update(payload).digest("hex");

    const a = generated_signature.toLowerCase();
    const b = razorpay_signature.toLowerCase();
    let match = false;
    if (a.length === b.length && /^[0-9a-f]+$/.test(a) && /^[0-9a-f]+$/.test(b)) {
      try {
        match = crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
      } catch {
        match = a === b;
      }
    } else {
      match = a === b;
    }

    if (match) {
      const appOrderId = String(req.body?.app_order_id || "").trim();
      if (appOrderId) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", appOrderId);
        if (orderUpdateError) {
          console.error("[verifyPayment] order status update failed:", orderUpdateError);
          return res.status(500).json({
            success: false,
            message: orderUpdateError.message,
            error: orderUpdateError.message,
            code: "ORDER_STATUS_UPDATE_FAILED",
          });
        }
      }

      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({ status: "success", razorpay_payment_id: razorpay_payment_id })
        .eq("razorpay_order_id", razorpay_order_id);
      if (paymentUpdateError) {
        console.error("[verifyPayment] payment status update failed:", paymentUpdateError);
        return res.status(500).json({
          success: false,
          message: paymentUpdateError.message,
          error: paymentUpdateError.message,
          code: "PAYMENT_STATUS_UPDATE_FAILED",
        });
      }
      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, message: "Invalid signature" });
  } catch (error) {
    console.error("[verifyPayment]", {
      code: error?.error?.code || error?.code,
      description: error?.error?.description || error?.description || error?.message,
    });
    const msg = error.message || "Verification failed";
    return res.status(500).json({
      success: false,
      message: msg,
      error: msg,
      code: "VERIFY_FAILED",
    });
  }
};
