import { Router } from "express";
import multer from "multer";
import axios from "axios";

/** Demo OTP users have non-UUID IDs like "demo-919325296264" — Supabase rejects these. */
const isDemoUser = (id) => /^demo-/i.test(String(id || ""));

import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import bikeRoutes from "./bike.routes.js";
import rentalRoutes from "./rental.routes.js";
import deliveryRoutes from "./delivery.routes.js";
import orderRoutes from "./order.routes.js";
import earningsRoutes from "./earnings.routes.js";
import walletRoutes from "./wallet.routes.js";
import smartlockRoutes from "./smartlock.routes.js";
import supportRoutes from "./support.routes.js";
import addressRoutes from "./address.routes.js";
import notificationRoutes from "./notification.routes.js";
import paymentMethodRoutes from "./paymentMethod.routes.js";
import skippedDaysRoutes from "./skippedDays.routes.js";
import trackingRoutes from "./trackingRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import subscriptionRoutes from "./subscription.routes.js";
import * as rentalController from "../controllers/rentalController.js";
import * as paymentController from "../controllers/paymentController.js";
import * as paymentAdminController from "../controllers/paymentAdminController.js";
import adminPaymentRoutes from "./adminPaymentRoutes.js";
import * as walletController from "../controllers/walletController.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createUserNotification } from "../services/notificationService.js";
import supabase from "../utils/supabaseClient.js";
import os from "os";
import { adminApiLogin } from "../controllers/adminAuthController.js";
import { requireAdminAuth, requirePermission } from "../admin/middleware/adminAuth.js";
import { apiJsonAdminOrders, apiJsonAdminPayments, maintenanceTickets } from "../admin/controllers/adminController.js";
import * as workflowStoryController from "../controllers/workflowStoryController.js";
import { addInMemoryBooking, listInMemoryBookings } from "../services/bookingStore.js";
import {
  updateDeliveryApplicationStatus,
} from "../services/deliveryPartnerStore.js";
import {
  addKycDocument,
  getLatestKycByUser,
  getLatestKycByUserAndType,
  listKycDocuments,
  listKycDocumentsByUser,
  updateKycDocument,
} from "../services/kycStore.js";
import {
  generateTicketNumber,
  isMissingTicketNumberColumnError,
  isUniqueViolation,
} from "../utils/ticketNumber.js";

const api = Router();
api.get("/health", (req, res) => res.json({ status: "ok" }));

api.get("/ads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/ads] Supabase Error:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch advertisements" });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[GET /api/ads] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/hubs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("[GET /api/hubs] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[GET /api/hubs] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const DOC_TYPE_TO_COLUMN = {
  aadhaar_front: "aadhaar_front_url",
  aadhaar_back: "aadhaar_back_url",
  pan: "pan_card_url",
  bill: "electricity_bill_url",
  selfie: "selfie_url",
  driving_license: "driving_license_url",
  profile: "image_url", // Added profile image mapping
};

api.use("/auth", authRoutes);
api.use("/user", userRoutes);
api.use("/bike", bikeRoutes);
api.use("/rental", rentalRoutes);
api.use("/partner-orders", orderRoutes);
api.use("/earnings", earningsRoutes);
api.use("/wallet", walletRoutes);
api.use("/smartlock", smartlockRoutes);
api.use("/support", supportRoutes);
api.use("/addresses", addressRoutes);
api.use("/notifications", notificationRoutes);
// ⚠️ PUBLIC: Checkout WebView page MUST be registered BEFORE paymentMethodRoutes
// because paymentMethodRoutes applies authMiddleware to ALL /payment/* paths
api.get("/payment/checkout", async (req, res) => {
  const { key_id, order_id, amount, currency = "INR", name = "BHAR BIKE", description = "Rental Payment", app_order_id, user_id, plan_id, amount_raw, ticket_id } = req.query;
  // Basic validation — never render raw query params without sanitization
  if (!key_id || !order_id || !amount) {
    return res.status(400).send("<h3>Invalid checkout request</h3>");
  }

  let prefillEmail = "";
  let prefillContact = "";

  if (user_id) {
    if (/^demo-/i.test(user_id)) {
      prefillContact = user_id.replace(/^demo-/i, "");
    } else {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, email")
          .eq("id", user_id)
          .maybeSingle();
        if (profile) {
          prefillEmail = profile.email || "";
          prefillContact = profile.phone || "";
        }
      } catch (e) {
        console.warn("Failed to fetch profile for prefill:", e?.message);
      }
    }
  }

  res.render("checkout", {
    key_id,
    order_id,
    amount,
    currency,
    name,
    description,
    app_order_id,
    user_id,
    plan_id: plan_id || "",
    amount_raw,
    ticket_id: ticket_id || "",
    prefill_email: prefillEmail,
    prefill_contact: prefillContact
  });
});

api.use("/payment", paymentMethodRoutes);
api.use("/skipped-days", skippedDaysRoutes);
api.use("/subscription", subscriptionRoutes);
api.use("/", trackingRoutes);
api.use("/", bookingRoutes);
api.post("/promo/apply", authMiddleware, walletController.applyPromo);
api.get("/bookings", authMiddleware, rentalController.bookings);

// Payment Routes — all require authentication
api.post("/payment/create-order", authMiddleware, asyncHandler(paymentController.createOrder));
api.post("/payment/verify", authMiddleware, asyncHandler(paymentController.verifyPayment));
// Backward-compat aliases — now auth-protected too
api.post("/create-order", authMiddleware, asyncHandler(paymentController.createOrder));
api.post("/verify-payment", authMiddleware, asyncHandler(paymentController.verifyPayment));
// NOTE: /payment/checkout is already registered above (before paymentMethodRoutes)

// PhonePe Callback / Webhook Handler
api.post("/payment/phonepe/callback", async (req, res) => {
  try {
    const { response } = req.body;
    const receivedChecksum = req.headers['x-verify'];

    if (!response || !receivedChecksum) {
      return res.status(400).send("Missing payload or checksum");
    }

    const { getActivePaymentConfig } = await import('../services/paymentConfigService.js');
    const { verifyPhonePeSignature } = await import('../services/phonepeService.js');
    
    const config = await getActivePaymentConfig();
    
    if (!verifyPhonePeSignature(config, response, receivedChecksum)) {
      console.warn("[PhonePe Webhook] Signature mismatch!");
      return res.status(400).send("Invalid Signature");
    }

    const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf8'));
    console.log("[PhonePe Webhook] Valid callback received:", decodedResponse.data.merchantTransactionId);

    const providerOrderId = decodedResponse.data.merchantTransactionId;
    const transactionId = decodedResponse.data.transactionId; // phonepe payment id
    const amountRupees = decodedResponse.data.amount / 100;
    const isSuccess = decodedResponse.code === 'PAYMENT_SUCCESS';

    if (isSuccess) {
      const { data: paymentRecord } = await supabase
        .from("payments")
        .update({ status: "success", razorpay_payment_id: transactionId })
        .eq("razorpay_order_id", providerOrderId)
        .select("id, user_id, order_id")
        .maybeSingle();

      if (paymentRecord) {
        const userId = paymentRecord.user_id;
        const appOrderId = paymentRecord.order_id;
        
        await supabase.from("orders").update({ status: "paid" }).eq("id", appOrderId);
        
        const { data: orderData } = await supabase.from("orders").select("plan_name").eq("id", appOrderId).maybeSingle();
        const planId = orderData?.plan_name;

        if (userId && planId && !planId.includes("ORD-WLT")) {
           const { createSubscription } = await import('../services/subscriptionService.js');
           await createSubscription(userId, planId, paymentRecord.id, amountRupees).catch(e => console.warn("Sub error", e));
        } else if (userId && String(planId).includes("ORD-WLT")) {
           const { addMoney } = await import('../services/walletService.js');
           await addMoney(userId, amountRupees, "Wallet Recharge (PhonePe)", transactionId, providerOrderId).catch(e => console.warn("Wallet error", e));
        }
      }
    } else {
       await supabase.from("payments").update({ status: "failed" }).eq("razorpay_order_id", providerOrderId);
    }
    
    res.status(200).send("OK");
  } catch(e) {
    console.error("[PhonePe Webhook] Error:", e);
    res.status(500).send("Internal Error");
  }
});

/**
 * Razorpay Webhook Handler — NO auth (Razorpay calls this directly)
 * Ensures subscriptions/wallet are activated even if app crashes after payment.
 * Configure this URL in Razorpay Dashboard → Webhooks: https://yourdomain.com/api/payment/webhook
 */
api.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const crypto = await import("crypto");
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto.default
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      if (signature !== expectedSignature) {
        console.warn("[Razorpay Webhook] Invalid signature — rejecting");
        return res.status(400).json({ success: false, message: "Invalid webhook signature" });
      }
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const orderEntity = req.body?.payload?.order?.entity;

    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured" && paymentEntity) {
      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;
      const amountPaise = paymentEntity.amount || 0;
      const amountRupees = amountPaise / 100;

      console.log(`[Razorpay Webhook] Payment captured: ${razorpayPaymentId} for order ${razorpayOrderId}`);

      // Update payment record to success
      const { data: paymentRecord } = await supabase
        .from("payments")
        .update({ status: "success", razorpay_payment_id: razorpayPaymentId })
        .eq("razorpay_order_id", razorpayOrderId)
        .select("id, user_id")
        .maybeSingle();

      if (!paymentRecord) {
        console.warn("[Razorpay Webhook] No matching payment record found for order:", razorpayOrderId);
        return res.json({ success: true, message: "Webhook received (no matching order)" });
      }

      const userId = paymentRecord?.user_id;
      const paymentRecordId = paymentRecord?.id;

      // Update order to paid
      await supabase.from("orders").update({ status: "paid" }).eq("razorpay_order_id", razorpayOrderId);

      if (userId) {
        // Check if subscription already exists for this payment (idempotent)
        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id, status")
          .eq("user_id", userId)
          .in("status", ["active"])
          .gt("end_date", new Date().toISOString())
          .maybeSingle();

        if (!existingSub) {
          // Look up order details to find plan_id
          const { data: orderRecord } = await supabase
            .from("orders")
            .select("plan_id, plan_name")
            .eq("razorpay_order_id", razorpayOrderId)
            .maybeSingle();

          const planId = orderRecord?.plan_id || orderRecord?.plan_name;
          if (planId) {
            try {
              const { createSubscription: createSubService } = await import("../services/subscriptionService.js");
              await createSubService(userId, planId, paymentRecordId, amountRupees);
              console.log(`[Razorpay Webhook] Subscription created for user ${userId} via webhook`);
            } catch (subErr) {
              console.warn("[Razorpay Webhook] Subscription creation failed:", subErr?.message);
            }
          } else {
            // No plan_id means it's a wallet recharge — add money
            try {
              const { addMoney } = await import("../services/walletService.js");
              await addMoney(userId, amountRupees, "Wallet Recharge (Webhook)", razorpayPaymentId, razorpayOrderId);
              console.log(`[Razorpay Webhook] Wallet credited ₹${amountRupees} for user ${userId}`);
            } catch (walletErr) {
              console.warn("[Razorpay Webhook] Wallet credit failed:", walletErr?.message);
            }
          }
        } else {
          console.log(`[Razorpay Webhook] Subscription already active for user ${userId} — skipping duplicate`);
        }
      }
    } else if (event === "payment.failed" && paymentEntity) {
      const razorpayOrderId = paymentEntity.order_id;
      // Mark payment as failed
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("razorpay_order_id", razorpayOrderId);
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("razorpay_order_id", razorpayOrderId);
      console.log(`[Razorpay Webhook] Payment failed for order ${razorpayOrderId} — records updated`);
    }

    return res.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("[Razorpay Webhook] Unexpected error:", err);
    return res.status(500).json({ success: false, message: "Webhook processing error" });
  }
});

/** Workflow story page — unlock demo tied to latest verified payment + order status */
api.post(
  "/workflow/story-unlock",
  requireAdminAuth,
  asyncHandler(workflowStoryController.postStoryUnlock),
);

// Delivery orders endpoints (DB-driven)
api.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_code, plan_name, pickup, drop_location, price, amount, distance, status, tracking_link, created_at")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false });

    // Fallback to demo listings if table is empty or missing
    if (error || !data || data.length === 0) {
      if (error) console.warn("[GET /api/orders] table missing or error - using demo fallback:", error.message);
      
      const locations = ["Vile Parle West", "Andheri East", "Bandra BKC", "Dadar West", "Juhu", "Powai", "Worli", "Colaba", "Malad", "Borivali"];
      const destinations = ["Juhu Beach", "Powai Lake", "Worli Sea Face", "Gateway of India", "Versova", "Bandra Fort", "Marine Drive", "Oberoi Mall"];
      const plans = ["Standard Delivery", "Express Delivery", "Heavy Loader", "Inter-city", "Urgent Document"];
      
      const demoOrders = Array.from({ length: 20 }, (_, i) => ({
        id: `demo-ord-${i + 1}`,
        order_code: `BK-${1000 + i}`,
        plan_name: plans[i % plans.length],
        pickup: locations[i % locations.length],
        drop_location: destinations[i % destinations.length],
        price: 80 + (i * 12),
        amount: 80 + (i * 12),
        distance: `${(2.5 + i * 0.8).toFixed(1)} km`,
        status: "pending",
        tracking_link: null,
        created_at: new Date(Date.now() - i * 1800000).toISOString()
      }));
      
      return res.json({ success: true, data: demoOrders, source: "demo" });
    }

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[GET /api/orders] error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch orders" });
  }
});

// Delivery alias endpoint for clients expecting /api/deliveries
api.get("/deliveries", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/deliveries] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[GET /api/deliveries] error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch deliveries" });
  }
});

api.post("/orders/accept", async (req, res) => {
  try {
    const order_id = String(req.body?.order_id || "").trim();
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }

    // Demo order handling
    if (order_id.startsWith("demo-ord-")) {
      return res.json({ 
        success: true, 
        data: { id: order_id, status: "accepted", tracking_link: "https://demo.tracking.link" } 
      });
    }

    let tracking_link = null;
    let vehicle_id = null;
    // ... Loconav logic omitted for brevity in instruction, keeping it in actual code ...
    const token = String(process.env.LOCONAV_USER_AUTH_TOKEN || process.env.LOCONAV_TOKEN || "").trim();
    if (token) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("id, vehicle_uuid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vehicle?.vehicle_uuid) {
        vehicle_id = vehicle.id;
        try {
          const [{ default: axios }] = await Promise.all([import("axios")]);
          const headers = { "User-Authentication": token };
          const liveRes = await axios.get(
            `https://api.a.loconav.com/integration/api/v1/vehicles/${vehicle.vehicle_uuid}/live_share_link`,
            { headers },
          );
          tracking_link = liveRes?.data?.data?.shareLink || null;
        } catch (loconavError) {
          console.error("[Loconav accept integration] failed:", loconavError?.message || loconavError);
        }
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "accepted", tracking_link, vehicle_id })
      .eq("id", order_id)
      .in("status", ["pending", "paid"])
      .select("id, status, tracking_link")
      .single();

    if (error) {
      console.error("[POST /api/orders/accept] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[POST /api/orders/accept] error:", error);
    return res.status(500).json({ success: false, message: "Unable to accept order" });
  }
});

api.post("/orders/reject", async (req, res) => {
  try {
    const order_id = String(req.body?.order_id || "").trim();
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }

    if (order_id.startsWith("demo-ord-")) {
      return res.json({ success: true, data: { id: order_id, status: "rejected" } });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "rejected" })
      .eq("id", order_id)
      .in("status", ["pending", "paid"])
      .select("id, status")
      .single();

    if (error) {
      console.error("[POST /api/orders/reject] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[POST /api/orders/reject] error:", error);
    return res.status(500).json({ success: false, message: "Unable to reject order" });
  }
});

api.get("/orders/:orderId", async (req, res) => {
  try {
    const orderId = String(req.params.orderId || "").trim();
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    if (orderId.startsWith("demo-ord-")) {
      return res.json({ 
        success: true, 
        data: { 
          id: orderId, 
          status: "accepted", 
          order_code: "BK-" + (1000 + parseInt(orderId.split("-")[2] || 0)),
          pickup: "Vile Parle West",
          drop_location: "Juhu Beach",
          amount: 150,
          customer_name: "Demo Customer"
        } 
      });
    }

    const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();

    if (error) {
      console.error("[GET /api/orders/:orderId] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let customer_name = null;
    const uid = order.user_id || order.userId;
    if (uid) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      customer_name = profile?.full_name || null;
      if (!customer_name) {
        const { data: userRow } = await supabase.from("users").select("full_name").eq("id", uid).maybeSingle();
        customer_name = userRow?.full_name || null;
      }
    }

    return res.json({ success: true, data: { ...order, customer_name } });
  } catch (error) {
    console.error("[GET /api/orders/:orderId] error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch order" });
  }
});

api.post("/orders/complete", async (req, res) => {
  try {
    const order_id = String(req.body?.order_id || "").trim();
    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }

    if (order_id.startsWith("demo-ord-")) {
      return res.json({ success: true, data: { id: order_id, status: "completed" } });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order_id)
      .eq("status", "accepted")
      .select()
      .single();

    if (error) {
      console.error("[POST /api/orders/complete] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: "Order not found or not in accepted status" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[POST /api/orders/complete] error:", error);
    return res.status(500).json({ success: false, message: "Unable to complete order" });
  }
});

api.post("/admin/login", adminApiLogin);

api.use("/admin", requireAdminAuth);

api.get("/admin/orders", apiJsonAdminOrders);
api.get("/admin/payments", apiJsonAdminPayments);

// Admin Hubs CRUD Routes
api.get("/admin/hubs", async (req, res) => {
  try {
    const [hubsRes, bikesRes] = await Promise.all([
      supabase.from("hubs").select("*").order("created_at", { ascending: false }),
      supabase.from("bikes").select("location")
    ]);

    if (hubsRes.error) {
      console.error("[GET /api/admin/hubs] hubs fetch failed:", hubsRes.error);
      return res.status(500).json({ success: false, message: hubsRes.error.message });
    }

    const hubs = hubsRes.data || [];
    const bikes = bikesRes.data || [];

    // Count bikes for each hub by matching bike.location with hub.name
    const enrichedHubs = hubs.map(hub => {
      const bikeCount = bikes.filter(b => b.location === hub.name).length;
      return {
        ...hub,
        bike_count: bikeCount
      };
    });

    return res.json({ success: true, data: enrichedHubs });
  } catch (err) {
    console.error("[GET /api/admin/hubs] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/admin/hubs", async (req, res) => {
  try {
    const { name, latitude, longitude, address, status } = req.body || {};
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Name, latitude, and longitude are required" });
    }

    const payload = {
      name: String(name).trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address ? String(address).trim() : null,
      status: status || "active"
    };

    const { data, error } = await supabase
      .from("hubs")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[POST /api/admin/hubs] create failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data, message: "Hub created successfully" });
  } catch (err) {
    console.error("[POST /api/admin/hubs] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.put("/admin/hubs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, address, status } = req.body || {};

    // Get the current hub to check the old name
    const { data: oldHub, error: getErr } = await supabase
      .from("hubs")
      .select("name")
      .eq("id", id)
      .maybeSingle();

    if (getErr || !oldHub) {
      return res.status(404).json({ success: false, message: "Hub not found" });
    }

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (latitude !== undefined) updatePayload.latitude = Number(latitude);
    if (longitude !== undefined) updatePayload.longitude = Number(longitude);
    if (address !== undefined) updatePayload.address = address ? String(address).trim() : null;
    if (status !== undefined) updatePayload.status = status;

    const { data: updatedHub, error: updateErr } = await supabase
      .from("hubs")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("[PUT /api/admin/hubs/:id] update failed:", updateErr);
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    // If name changed, update bike locations matching old name to new name
    if (name && oldHub.name !== updatedHub.name) {
      try {
        const { error: bikesUpdateErr } = await supabase
          .from("bikes")
          .update({ location: updatedHub.name })
          .eq("location", oldHub.name);
        if (bikesUpdateErr) {
          console.warn("[PUT /api/admin/hubs] failed to cascade update matching bikes' locations:", bikesUpdateErr.message);
        }
      } catch (cascadeErr) {
        console.warn("[PUT /api/admin/hubs] bike cascade update exception:", cascadeErr.message);
      }
    }

    return res.json({ success: true, data: updatedHub, message: "Hub updated successfully" });
  } catch (err) {
    console.error("[PUT /api/admin/hubs/:id] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.delete("/admin/hubs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the hub first to get its name
    const { data: hub, error: getErr } = await supabase
      .from("hubs")
      .select("name")
      .eq("id", id)
      .maybeSingle();

    if (getErr || !hub) {
      return res.status(404).json({ success: false, message: "Hub not found" });
    }

    const { error: deleteErr } = await supabase
      .from("hubs")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("[DELETE /api/admin/hubs/:id] delete failed:", deleteErr);
      return res.status(500).json({ success: false, message: deleteErr.message });
    }

    // Reset matching bikes' location to "Unknown Yard"
    try {
      const { error: bikesResetErr } = await supabase
        .from("bikes")
        .update({ location: "Unknown Yard" })
        .eq("location", hub.name);
      if (bikesResetErr) {
        console.warn("[DELETE /api/admin/hubs] failed to reset matching bikes' locations:", bikesResetErr.message);
      }
    } catch (cascadeErr) {
      console.warn("[DELETE /api/admin/hubs] bike reset exception:", cascadeErr.message);
    }

    return res.json({ success: true, message: "Hub deleted successfully" });
  } catch (err) {
    console.error("[DELETE /api/admin/hubs/:id] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Payment Admin Routes
api.use("/admin/payment", adminPaymentRoutes);
api.post("/admin/payment-config", asyncHandler(paymentAdminController.addConfig));

// Admin Order Creation
api.post("/admin/orders/create", async (req, res) => {
  try {
    const { pickup, drop_location, price, plan_name, distance } = req.body || {};
    if (!pickup || !drop_location || !price) {
      return res.status(400).json({ success: false, message: "Pickup, Drop and Price are required" });
    }

    const order_code = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      order_code,
      pickup,
      drop_location,
      price: Number(price),
      amount: Number(price),
      plan_name: plan_name || "Standard Delivery",
      distance: distance || "5.0 km",
      status: "pending",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("orders").insert([payload]).select().single();

    if (error) {
      console.error("[POST /api/admin/orders/create] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, data, message: "Order created successfully" });
  } catch (error) {
    console.error("[POST /api/admin/orders/create] error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/delivery/apply", async (req, res) => {
  try {
    const {
      user_id,
      name,
      full_name,
      phone,
      email,
      city,
      vehicle_type,
      license_number,
      aadhar_number,
      license_url,
      aadhar_url,
      photo_url,
      pan_url,
      electricity_bill_url,
    } = req.body || {};

    if (!user_id || !(full_name || name) || !city || !vehicle_type || !license_number || !aadhar_number) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Demo users can't be persisted — return mock success
    if (isDemoUser(user_id)) {
      return res.json({ success: true, message: "Application submitted (demo mode)", data: { status: "review" } });
    }

    const resolvedName = full_name || name;
    const payload = {
      user_id,
      name: resolvedName,
      full_name: resolvedName,
      phone: phone || null,
      email: email || null,
      city,
      vehicle_type,
      license_number,
      aadhar_number,
      license_url: license_url || null,
      aadhar_url: aadhar_url || null,
      photo_url: photo_url || null,
      status: "review",
    };

    let { data: existing, error: existingError } = await supabase
      .from("delivery_partners")
      .select("id, status")
      .eq("user_id", user_id)
      .maybeSingle();
    if (existingError) {
      console.error("[POST /api/delivery/apply] existing lookup error:", existingError);
      return res.status(500).json({ success: false, message: existingError.message });
    }

    let data;
    let error;

    if (existing?.id) {
      ({ data, error } = await supabase
        .from("delivery_partners")
        .update({ ...payload, status: "review" })
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase.from("delivery_partners").insert([payload]).select().single());
    }
    if (error) {
      console.error("[POST /api/delivery/apply] insert/update failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    createUserNotification(
      user_id,
      "Application Submitted",
      "Your delivery partner application has been successfully submitted and is under review.",
      "kyc"
    ).catch((err) => console.warn("[POST /api/delivery/apply] notification failed:", err?.message));

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/delivery/status", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "");
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    // Demo OTP users have non-UUID IDs — return mock status instead of querying Supabase
    if (isDemoUser(userId)) {
      return res.json({ success: true, status: null });
    }

    let { data, error } = await supabase
      .from("delivery_partners")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (
        msg.includes("could not find the table") ||
        msg.includes("does not exist") ||
        error.code === "42P01" ||
        msg.includes("row-level security") ||
        error.code === "42501"
      ) {
        return res.json({ success: true, status: null });
      }
      console.error("[GET /api/delivery/status] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, status: data?.status || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/admin/delivery", async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("delivery_partners")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/admin/delivery] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin alias endpoint for delivery records
api.get("/admin/deliveries", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/admin/deliveries] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[GET /api/admin/deliveries] error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch admin deliveries" });
  }
});

// Delivery partner focused endpoint (all active lifecycle states except completed/cancelled/rejected)
api.get("/delivery-partner/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "accepted", "pickup_started", "in_transit", "paid"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/delivery-partner/orders] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[GET /api/delivery-partner/orders] error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch delivery-partner orders" });
  }
});

api.patch("/admin/delivery/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").toLowerCase();
    if (!["approved", "rejected"].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "status must be approved or rejected" });
    }

    let { data, error } = await supabase
      .from("delivery_partners")
      .update({ status: nextStatus })
      .eq("id", id)
      .select()
      .single();

    if (error?.message?.toLowerCase().includes("could not find the table 'public.delivery_partners'")) {
      data = updateDeliveryApplicationStatus(id, nextStatus);
      if (!data) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      error = null;
    }

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    if (data?.user_id) {
      const isApproved = nextStatus === "approved";
      createUserNotification(
        data.user_id,
        isApproved ? "Delivery Partner Approved! 🎉" : "Application Rejected",
        isApproved
          ? "Congratulations! Your delivery partner application has been approved. Go online and start earning today!"
          : "Your delivery partner application was rejected. Please review your documents and re-apply.",
        isApproved ? "success" : "kyc"
      ).catch((err) => console.warn("[PATCH /admin/delivery/:id] notification failed:", err?.message));
    }

    return res.json({
      success: true,
      data,
      message: nextStatus === "approved" ? "Approved successfully" : "Rejected successfully",
    });
  } catch (err) {
    console.error("[POST /api/support/application/:id] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/support/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/support/user/:userId] failed:", error);
      return res.status(500).json({ success: false, message: error.message || "Unable to load tickets" });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[GET /api/support/user/:userId] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/support/ticket/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      return res.status(500).json({ success: false, message: error.message || "Unable to load ticket" });
    }
    return res.json({ success: true, data: data || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/admin/support", requireAdminAuth, requirePermission("manage_support"), async (req, res) => {
  try {
    const status = String(req.query.status || "all").toLowerCase();
    const search = String(req.query.search || "").trim().toLowerCase();
    const sort = String(req.query.sort || "newest").toLowerCase() === "oldest" ? "oldest" : "newest";
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: sort === "oldest" });
    if (status !== "all") {
      query = query.eq("status", status);
    }
    let { data, error } = await query;
    if (error) {
      console.error("[GET /api/admin/support] failed:", error);
      return res.status(500).json({ success: false, message: error.message || "Fetch failed" });
    }
    if (search) {
      const q = search.replace(/^#/, "");
      data = (Array.isArray(data) ? data : []).filter((x) => {
        const id = String(x.id || "").toLowerCase();
        const userId = String(x.user_id || "").toLowerCase();
        const ticketNum = x.ticket_number != null ? String(x.ticket_number) : "";
        return id.includes(q) || userId.includes(q) || ticketNum.includes(q);
      });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[GET /api/admin/support] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.put("/admin/support/:id", requireAdminAuth, requirePermission("manage_support"), async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || "").toLowerCase();
    const repair_cost = req.body?.repair_cost;
    
    if (status && !["pending", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    
    const updateData = {};
    if (status) updateData.status = status;
    if (repair_cost !== undefined) updateData.repair_cost = Number(repair_cost) || 0;

    const { data, error } = await supabase
      .from("support_tickets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[PUT /api/admin/support/:id] failed:", error);
      return res.status(500).json({ success: false, message: error.message || "Update failed" });
    }
    return res.json({ success: true, data, message: "Ticket status updated" });
  } catch (err) {
    console.error("[PUT /api/admin/support/:id] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== ADMIN MAINTENANCE REST ENDPOINTS ====================
api.get("/admin/maintenance", requireAdminAuth, requirePermission("manage_bikes"), async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const search = String(req.query.search || "").trim().toLowerCase();

    // Fetch all bikes so we can return them for the "add to maintenance" selection
    const { data: bikesData, error: bikesError } = await supabase
      .from("bikes")
      .select("*");

    if (bikesError) {
      console.error("[GET /api/admin/maintenance] bikes fetch failed:", bikesError);
    }

    const bikes = (bikesData || []).map(b => ({
      id: b.id,
      bike_code: b.bike_code || b.bikeCode || "BIKE-NEW",
      status: b.status,
    }));

    const filteredTickets = maintenanceTickets.filter((ticket) => {
      if (search && !String(ticket.bikeCode || "").toLowerCase().includes(search)) return false;
      if (filter === "active") {
        return ticket.status === "under_repair" || ticket.status === "in_progress";
      }
      if (filter === "completed") {
        return ticket.status === "completed";
      }
      return true;
    });

    const maintenanceStats = {
      total: filteredTickets.length,
      inProgress: filteredTickets.filter((x) => x.status === "in_progress").length,
      completed: filteredTickets.filter((x) => x.status === "completed").length,
      totalCost: filteredTickets.reduce((sum, x) => sum + Number(x.repairCost || 0), 0),
    };

    return res.json({
      success: true,
      data: {
        tickets: filteredTickets,
        bikes,
        stats: maintenanceStats
      }
    });
  } catch (err) {
    console.error("[GET /api/admin/maintenance] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/admin/maintenance/add", requireAdminAuth, requirePermission("manage_bikes"), async (req, res) => {
  try {
    const { bikeId, issueType, description, technicianName, repairCost, reportedDate, expectedFixDate } = req.body;
    if (!bikeId) {
      return res.status(400).json({ success: false, message: "bikeId is required" });
    }

    // Fetch the bike from Supabase to get its code
    const { data: bike, error: bikeError } = await supabase
      .from("bikes")
      .select("*")
      .eq("id", bikeId)
      .single();

    if (bikeError || !bike) {
      return res.status(400).json({ success: false, message: "Invalid bike ID" });
    }

    const ticket = {
      id: `MT-${1000 + maintenanceTickets.length + 1}`,
      bikeId: bike.id,
      bikeCode: bike.bike_code || "BIKE-NEW",
      issueType: issueType || "General Check",
      description: description || "No details",
      status: "under_repair",
      technicianName: technicianName || "Unassigned",
      repairCost: Number(repairCost || 0),
      reportedDate: reportedDate || new Date().toISOString().slice(0, 10),
      expectedFixDate: expectedFixDate || new Date().toISOString().slice(0, 10),
      fixedDate: null,
    };

    maintenanceTickets.unshift(ticket);

    // Update bike status to maintenance
    await supabase.from("bikes").update({ status: "maintenance" }).eq("id", bike.id);

    return res.json({ success: true, data: ticket, message: "Bike added to maintenance" });
  } catch (err) {
    console.error("[POST /api/admin/maintenance/add] failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.put("/admin/maintenance/:ticketId", requireAdminAuth, requirePermission("manage_bikes"), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, technicianName, repairCost, expectedFixDate } = req.body;

    const ticket = maintenanceTickets.find((item) => item.id === ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (status) ticket.status = status;
    if (technicianName !== undefined) ticket.technicianName = technicianName;
    if (repairCost !== undefined) ticket.repairCost = Number(repairCost) || 0;
    if (expectedFixDate !== undefined) ticket.expectedFixDate = expectedFixDate;

    if (ticket.status === "completed") {
      ticket.fixedDate = new Date().toISOString().slice(0, 10);
      await supabase.from("bikes").update({ status: "available" }).eq("id", ticket.bikeId);
    }

    return res.json({ success: true, data: ticket, message: "Maintenance ticket updated" });
  } catch (err) {
    console.error("[PUT /api/admin/maintenance/:ticketId] failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.delete("/admin/maintenance/:ticketId", requireAdminAuth, requirePermission("manage_bikes"), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const idx = maintenanceTickets.findIndex((item) => item.id === ticketId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const [ticket] = maintenanceTickets.splice(idx, 1);
    if (ticket.status !== "completed") {
      await supabase.from("bikes").update({ status: "available" }).eq("id", ticket.bikeId);
    }

    return res.json({ success: true, message: "Maintenance ticket removed" });
  } catch (err) {
    console.error("[DELETE /api/admin/maintenance/:ticketId] failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/admin/maintenance/bike/:bikeId/fixed", requireAdminAuth, requirePermission("manage_bikes"), async (req, res) => {
  try {
    const { bikeId } = req.params;
    await supabase.from("bikes").update({ status: "available" }).eq("id", bikeId);

    const ticket = maintenanceTickets.find((item) => item.bikeId === bikeId);
    if (ticket) {
      ticket.status = "completed";
      ticket.fixedDate = new Date().toISOString().slice(0, 10);
    }

    return res.json({ success: true, message: "Bike marked as fixed" });
  } catch (err) {
    console.error("[POST /api/admin/maintenance/bike/:bikeId/fixed] failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================================
// Cloudflare AI Vision KYC Verification
// Model: @cf/qwen/qwen2.5-vl-7b-instruct
// ============================================================

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || "";
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN   || "";
const CF_AI_MODEL   = "@cf/meta/llama-3.2-11b-vision-instruct";

const KYC_PROMPTS = {
  pan: {
    system: `You are a helpful visual checker. Analyze the provided image.
Your only job is to determine if the image is a printed PAN Card. A valid PAN Card typically contains: the words "INCOME TAX DEPARTMENT" or "PERMANENT ACCOUNT NUMBER", an alphanumeric code structure, a photo of a person, and typical blue/green official card layout.
Respond in this exact JSON format:
{"valid": true, "reason": "PAN card verified successfully"}
OR
{"valid": false, "reason": "Image does not exhibit typical PAN Card layout or text details"}`,
    userPrompt: "Determine if this image is a valid printed PAN Card. Check the visual layout and text, and respond in the required JSON format."
  },
  aadhaar: {
    system: `You are a helpful visual checker. Analyze the provided image.
Your only job is to determine if the image is a printed Aadhaar Card (front or back side). A valid Aadhaar Card typically contains: "GOVERNMENT OF INDIA" or "भारत सरकार" or "Unique Identification Authority" or the typical red/blue official card layout, a passport-style photo of a person (on the front), or address/relationships on the back.
Respond in this exact JSON format:
{"valid": true, "reason": "Aadhaar card verified successfully"}
OR
{"valid": false, "reason": "Image does not exhibit typical Aadhaar Card layout or text details"}`,
    userPrompt: "Determine if this image is a valid printed Aadhaar Card (front or back). Check the visual layout and text, and respond in the required JSON format."
  },
  driving_license: {
    system: `You are a helpful visual checker. Analyze the provided image.
Your only job is to determine if the image is a printed Driving License. A valid Driving License typically contains: "DRIVING LICENCE" or "DRIVING LICENSE", state emblems or transport department headers, a passport photo of the holder, and typical official license layout.
Respond in this exact JSON format:
{"valid": true, "reason": "Driving license verified successfully"}
OR
{"valid": false, "reason": "Image does not exhibit typical Driving License layout or text details"}`,
    userPrompt: "Determine if this image is a valid printed Driving License. Check the visual layout and text, and respond in the required JSON format."
  },
  bill: {
    system: `You are a helpful visual checker. Analyze the provided image.
Your only job is to determine if the image is an electricity bill or utility bill document. It typically exhibits billing tables, name of a power utility or board (such as MSEDCL, Tata Power, BESCOM, Adani Electricity, etc.), and billing address or amounts.
Respond in this exact JSON format:
{"valid": true, "reason": "Electricity bill verified successfully"}
OR
{"valid": false, "reason": "Image does not exhibit typical electricity bill layout or text details"}`,
    userPrompt: "Determine if this image is a valid printed electricity bill. Check the visual layout and text, and respond in the required JSON format."
  },
  selfie: {
    system: `You are a helpful visual checker. Analyze the provided image.
Your only job is to determine if the image is a clear, well-lit selfie or close-up photo of a single human face looking at the camera. The face must not be masked, covered, or obscured.
Respond in this exact JSON format:
{"valid": true, "reason": "Selfie face verified successfully"}
OR
{"valid": false, "reason": "Image does not contain a clear, unmasked human face looking at the camera"}`,
    userPrompt: "Determine if this image is a clear selfie with a clearly visible human face, and respond in the required JSON format."
  }
};

/**
 * Verify a KYC document using Cloudflare AI Llama 3.2 Vision
 * @param {Buffer} buffer - The image buffer
 * @param {"pan"|"aadhaar"|"driving_license"|"bill"|"selfie"} docType - Document type
 * @param {string} originalName - Original filename for pre-filtering
 * @returns {Promise<{isValid: boolean, reason: string}>}
 */
async function verifyDocumentWithAI(buffer, docType, originalName = "") {
  // Reject files that are too small to be real documents (< 5KB)
  if (buffer.length < 5000) {
    return { isValid: false, reason: "The uploaded file is too small or corrupted. Please upload a clear photo of your document (minimum 5KB)." };
  }

  const prompt = KYC_PROMPTS[docType];
  if (!prompt) {
    return { isValid: false, reason: `Unknown document type: ${docType}` };
  }

  try {
    // Detect mime type from buffer magic bytes
    let mimeType = "image/jpeg";
    if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = "image/png";
    else if (buffer[0] === 0x25 && buffer[1] === 0x50) mimeType = "application/pdf";

    // PDFs not supported by vision model — reject early
    if (mimeType === "application/pdf") {
      return { isValid: false, reason: "PDF files are not supported for document verification. Please upload a clear photo (JPG or PNG) of your document." };
    }

    if (!CF_ACCOUNT_ID || !CF_AI_TOKEN) {
      console.error("[verifyDocumentWithAI] Cloudflare AI credentials missing on server.");
      return { isValid: false, reason: "Verification service credentials missing on server. Please contact administrator." };
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_AI_MODEL}`;
    const imageArray = Array.from(new Uint8Array(buffer));
    const fullPrompt = `<image>\n${prompt.system}\n\nUser: ${prompt.userPrompt}\nAssistant:`;

    console.log(`[verifyDocumentWithAI] Dispatching to Cloudflare Llama 3.2 Vision for docType=${docType}...`);
    const cfResponse = await axios.post(cfUrl, {
      image: imageArray,
      prompt: fullPrompt,
      max_tokens: 150
    }, {
      headers: {
        "Authorization": `Bearer ${CF_AI_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });

    const aiText = String(cfResponse.data?.result?.response || cfResponse.data?.result?.description || "").trim();
    console.log(`[verifyDocumentWithAI] AI Response for ${docType}:`, aiText);

    // Parse the AI response using a tolerant, robust parser
    let isValid = false;
    let reason = "";

    // 1. Extract valid status
    const validMatch = aiText.match(/(?:"valid"|'valid'|\bvalid\b)\s*:\s*(true|false)/i);
    if (validMatch) {
      isValid = validMatch[1].toLowerCase() === "true";
    } else {
      // Fallback: simple text analysis if the model didn't return standard JSON-like structure
      const lowerText = aiText.toLowerCase();
      if (lowerText.includes("verified successfully") || lowerText.includes("face verified") || lowerText.includes("document verified")) {
        isValid = true;
      }
    }

    // 2. Extract reason
    const reasonMatch = aiText.match(/(?:"reason"|'reason'|\breason\b)\s*:\s*["']([^"']+)["']/i);
    if (reasonMatch) {
      reason = reasonMatch[1];
    } else {
      // Tolerate unquoted reason values or different quote characters
      const rawReasonMatch = aiText.match(/(?:"reason"|'reason'|\breason\b)\s*:\s*([^\n,}]+)/i);
      if (rawReasonMatch) {
        reason = rawReasonMatch[1].replace(/["'}]/g, "").trim();
      }
    }

    if (!reason) {
      reason = isValid 
        ? "Document verified successfully" 
        : "Document could not be verified. Please upload a proper document photo.";
    }

    console.log(`[verifyDocumentWithAI] Parsed result for ${docType}: isValid=${isValid}, reason="${reason}"`);

    return { isValid, reason };

  } catch (err) {
    console.error(`[verifyDocumentWithAI] Cloudflare AI vision error for ${docType}:`, err?.response?.data || err.message);
    return { isValid: false, reason: "AI verification service temporarily offline or error encountered. Please make sure the uploaded image is a clear, well-lit document photo and try again." };
  }
}

// Legacy wrappers kept for compatibility — all now delegate to Llama 3.2 Vision
async function detectPanCard(buffer, originalName = "") {
  return verifyDocumentWithAI(buffer, "pan", originalName);
}
async function detectAadhaarCard(buffer, originalName = "") {
  return verifyDocumentWithAI(buffer, "aadhaar", originalName);
}
async function detectDrivingLicense(buffer, originalName = "") {
  return verifyDocumentWithAI(buffer, "driving_license", originalName);
}
async function detectElectricityBill(buffer, originalName = "") {
  return verifyDocumentWithAI(buffer, "bill", originalName);
}
async function detectSelfie(buffer, originalName = "") {
  return verifyDocumentWithAI(buffer, "selfie", originalName);
}



api.post("/upload-document", upload.single("file"), async (req, res) => {
  try {
    const type = String(req.body?.type || "").trim().toLowerCase();
    const userId = String(req.body?.user_id || "").trim();
    const file = req.file;

    if (!file || !userId || !type) {
      return res.status(400).json({ success: false, message: "file, type and user_id are required" });
    }

    // Demo users can't upload to Supabase storage — return mock success
    if (isDemoUser(userId)) {
      return res.json({ success: true, data: { type, file_url: `https://demo.example.com/${type}_mock.jpg` } });
    }

    if (!Object.prototype.hasOwnProperty.call(DOC_TYPE_TO_COLUMN, type)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only jpg, png, pdf allowed" });
    }

    if (type === "pan") {
      const verification = await detectPanCard(file.buffer, file.originalname);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: "The document is not valid. Please try a clear and valid document.\n\nTip: Make sure the document is well-lit, not blurry, and all 4 corners are visible."
        });
      }
    }

    if (type === "aadhaar_front" || type === "aadhaar_back") {
      const verification = await detectAadhaarCard(file.buffer, file.originalname);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: "The document is not valid. Please try a clear and valid document.\n\nTip: Make sure the document is well-lit, not blurry, and all 4 corners are visible."
        });
      }
    }

    if (type === "driving_license") {
      const verification = await detectDrivingLicense(file.buffer, file.originalname);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: "The document is not valid. Please try a clear and valid document.\n\nTip: Make sure the document is well-lit, not blurry, and all 4 corners are visible."
        });
      }
    }

    if (type === "bill") {
      const verification = await detectElectricityBill(file.buffer, file.originalname);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: "The document is not valid. Please try a clear and valid document.\n\nTip: Make sure the document is well-lit, not blurry, and all 4 corners are visible."
        });
      }
    }

    if (type === "selfie") {
      const verification = await detectSelfie(file.buffer, file.originalname);
      if (!verification.isValid) {
        return res.status(400).json({
          success: false,
          message: "The selfie photo is not valid. Please try a clear and valid selfie.\n\nTip: Make sure your face is well-lit, looking directly at the camera, and not covered by a mask or sunglasses."
        });
      }
    }

    const safeMimeExtension =
      file.mimetype === "application/pdf" ? "pdf" : file.mimetype === "image/png" ? "png" : "jpg";
    const filePath = `${userId}/${type}_${Date.now()}.${safeMimeExtension}`;
    const { error: uploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });

    if (uploadError) {
      console.error("[POST /api/upload-document] upload failed:", uploadError);
      // If bucket doesn't exist, return mock URL so KYC flow doesn't break
      const mockUrl = `https://kyc.bharbike.local/${filePath}`;
      const column = DOC_TYPE_TO_COLUMN[type];
      try {
        await supabase.from("users").update({ [column]: mockUrl }).eq("id", userId);
      } catch (dbErr) {
        console.warn("[POST /api/upload-document] users column missing (non-blocking):", dbErr?.message);
      }
      // Also insert into kyc_documents table so /kyc/summary can find it
      try {
        const kycType = type === "bill" ? "electricity_bill" : type === "aadhaar_front" || type === "aadhaar_back" ? "aadhaar" : type;
        await supabase.from("kyc_documents").upsert({
          user_id: userId,
          type: kycType,
          file_url: mockUrl,
          status: "pending",
        }, { onConflict: "user_id,type" });
      } catch (kycErr) {
        console.warn("[POST /api/upload-document] kyc_documents insert skipped (non-blocking):", kycErr?.message);
      }
      return res.json({ success: true, data: { type, file_url: mockUrl }, warning: "Storage bucket missing — using mock URL" });
    }

    const { data: publicData } = supabase.storage.from("kyc-documents").getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl || null;
    if (!publicUrl) {
      return res.status(500).json({ success: false, message: "Unable to generate public URL" });
    }
    const column = DOC_TYPE_TO_COLUMN[type];
    try {
      await supabase.from("users").update({ [column]: publicUrl }).eq("id", userId);
    } catch (dbErr) {
      console.warn("[POST /api/upload-document] users column missing (non-blocking):", dbErr?.message);
    }

    // Also insert into kyc_documents table so /kyc/summary can find it
    try {
      const kycType = type === "bill" ? "electricity_bill" : type === "aadhaar_front" || type === "aadhaar_back" ? "aadhaar" : type;
      await supabase.from("kyc_documents").upsert({
        user_id: userId,
        type: kycType,
        file_url: publicUrl,
        status: "pending",
      }, { onConflict: "user_id,type" });
    } catch (kycErr) {
      console.warn("[POST /api/upload-document] kyc_documents insert skipped (non-blocking):", kycErr?.message);
    }

    return res.json({ success: true, data: { type, file_url: publicUrl } });
  } catch (err) {
    console.error("[POST /api/upload-document] unexpected:", err);
    const message = err?.code === "LIMIT_FILE_SIZE" ? "File size must be <= 5MB" : "Server error";
    return res.status(500).json({ success: false, message });
  }
});

// Didit Hosted KYC: Helper function to initiate a verification session
async function initiateDiditSession(userId) {
  const apiKey = process.env.DIDIT_API_KEY || "m8c9swISCz8KddMoe0AweImRiOGcmnIfOxadzi8epvk";
  let workflowId = "45c50b06-8873-4def-badb-de0ae91ead97"; // Default Custom KYC workflow

  // Dynamically fetch workflows from Didit to find default or specific one
  try {
    const wResponse = await fetch("https://verification.didit.me/v3/workflows/", {
      method: "GET",
      headers: {
        "x-api-key": apiKey
      }
    });
    if (wResponse.ok) {
      const workflows = await wResponse.json();
      const activeKyc = workflows.results?.find(w => w.workflow_type === "kyc" && w.is_default);
      if (activeKyc) {
        workflowId = activeKyc.workflow_id;
        console.log(`[Didit Session] Found active default workflow: ${workflowId} (${activeKyc.workflow_label})`);
      }
    }
  } catch (wErr) {
    console.warn("[Didit Session] Unable to fetch workflows, using default:", wErr.message);
  }

  // Call Didit API to create the Hosted Session
  const response = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: userId
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Didit session creation failed: ${errorText}`);
  }

  return await response.json();
}

// Didit Hosted KYC: Initiate verification session (POST)
api.post("/kyc/initiate-session", async (req, res) => {
  try {
    const userId = String(req.body?.userId || req.body?.user_id || req.query?.user_id || "").trim();
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId/user_id is required" });
    }

    const data = await initiateDiditSession(userId);
    return res.status(201).json({
      success: true,
      session_id: data.session_id,
      session_token: data.session_token,
      url: data.url,
      vendor_data: data.vendor_data
    });
  } catch (err) {
    console.error("[POST /api/kyc/initiate-session] error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// Didit Hosted KYC: Initiate verification session (GET)
api.get("/kyc/initiate-session", async (req, res) => {
  try {
    const userId = String(req.query?.userId || req.query?.user_id || "").trim();
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId/user_id is required" });
    }
    
    const data = await initiateDiditSession(userId);
    return res.status(201).json({
      success: true,
      session_id: data.session_id,
      session_token: data.session_token,
      url: data.url,
      vendor_data: data.vendor_data
    });
  } catch (err) {
    console.error("[GET /api/kyc/initiate-session] error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// Didit Hosted KYC: Webhook receiver
api.post("/kyc/webhook", async (req, res) => {
  try {
    console.log("[POST /api/kyc/webhook] Received payload:", JSON.stringify(req.body, null, 2));

    const signature = req.headers["x-didit-signature"] || req.headers["x-signature"];
    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

    if (webhookSecret && webhookSecret !== "mock_webhook_secret_for_local_testing" && !signature) {
      console.warn("[POST /api/kyc/webhook] Warning: webhook secret is set but signature is missing.");
    }

    const payload = req.body || {};
    const status = String(payload.status || payload.decision?.status || "").toUpperCase();
    const userId = payload.vendor_data || payload.decision?.vendor_data;
    const sessionId = payload.session_id || payload.decision?.session_id;

    if (!userId) {
      console.warn("[POST /api/kyc/webhook] Missing vendor_data/user_id in payload.");
      return res.status(400).json({ success: false, message: "vendor_data/user_id is required" });
    }

    console.log(`[POST /api/kyc/webhook] Processing user ${userId} with status ${status}`);

    // If it's a demo user, bypass database writes to avoid UUID syntax errors
    if (isDemoUser(userId)) {
      console.log(`[POST /api/kyc/webhook] Demo user ${userId} detected. Bypassing database writes.`);
      return res.json({ success: true, message: "Demo user processed successfully" });
    }

    if (status === "APPROVED") {
      const idVerifications = payload.decision?.id_verifications || payload.id_verifications || [];
      console.log(`[POST /api/kyc/webhook] Found ${idVerifications.length} ID verifications.`);

      let docType = "pan_card";
      let docNumber = "";
      let fullName = "";
      let docFileUrl = "https://kyc.bharbike.local/didit_verified_placeholder.jpg";

      if (idVerifications.length > 0) {
        const primaryId = idVerifications[0];
        docType = String(primaryId.document_type || "pan_card").toLowerCase();
        docNumber = primaryId.document_number || "";
        fullName = `${primaryId.first_name || ""} ${primaryId.last_name || ""}`.trim();
        docFileUrl = primaryId.front_image_url || primaryId.image_url || docFileUrl;
      }

      // Map Didit document type to BharBike kyc_documents table 'type' column check constraint:
      // CHECK (type IN ('aadhaar', 'driving_license', 'electricity_bill', 'pan_card'))
      let mappedType = "pan_card";
      if (docType.includes("aadhaar") || docType.includes("national")) {
        mappedType = "aadhaar";
      } else if (docType.includes("driver") || docType.includes("license") || docType.includes("dl")) {
        mappedType = "driving_license";
      } else if (docType.includes("bill")) {
        mappedType = "electricity_bill";
      } else if (docType.includes("pan")) {
        mappedType = "pan_card";
      }

      const verifiedPayload = {
        user_id: userId,
        type: mappedType,
        consumer_name: fullName || "Verified User",
        consumer_number: docNumber || "N/A",
        board_name: "Didit Auto Verification",
        address: "Verified via Didit Hosted Flow",
        file_url: docFileUrl,
        status: "verified"
      };

      // 1. Update in-memory kycStore fallback
      try {
        addKycDocument(verifiedPayload);
      } catch (storeErr) {
        console.warn("[POST /api/kyc/webhook] kycStore insert skipped:", storeErr?.message);
      }

      // 2. Update real Supabase kyc_documents table
      try {
        const { error } = await supabase
          .from("kyc_documents")
          .upsert(verifiedPayload, { onConflict: "user_id,type" });
        if (error) {
          console.error("[POST /api/kyc/webhook] Supabase kyc_documents insert failed:", error);
        } else {
          console.log("[POST /api/kyc/webhook] Supabase kyc_documents updated successfully.");
        }
      } catch (dbErr) {
        console.error("[POST /api/kyc/webhook] Supabase DB exception:", dbErr?.message);
      }

      // 3. Update matching column in users table for fallback
      try {
        let userColumn = "pan_card_url";
        if (mappedType === "aadhaar") {
          userColumn = "aadhaar_front_url";
        } else if (mappedType === "driving_license") {
          userColumn = "driving_license_url";
        } else if (mappedType === "electricity_bill") {
          userColumn = "electricity_bill_url";
        }

        const { error } = await supabase
          .from("users")
          .update({ [userColumn]: docFileUrl })
          .eq("id", userId);
        if (error) {
          console.warn(`[POST /api/kyc/webhook] users column update failed: ${error.message}`);
        } else {
          console.log(`[POST /api/kyc/webhook] users.${userColumn} updated.`);
        }
      } catch (userErr) {
        console.warn("[POST /api/kyc/webhook] users update skipped:", userErr?.message);
      }

      // Send KYC approval notification (non-blocking)
      createUserNotification(
        userId,
        "KYC Approved! 🪪 ✅",
        "Congratulations! Your identity document has been verified. You can now unlock and ride any e-bike in our fleet!",
        "success"
      ).catch((err) => console.warn("[kyc/webhook] approval notification failed:", err?.message));

      return res.json({ success: true, message: "KYC approved and database updated" });

    } else if (status === "DECLINED" || status === "FAILED") {
      const declineReason = payload.decision?.warnings?.join(", ") || payload.reason || "Verification failed";

      const rejectedPayload = {
        user_id: userId,
        type: "pan_card",
        status: "rejected",
        reason: declineReason,
        file_url: "https://kyc.bharbike.local/didit_rejected_placeholder.jpg"
      };

      try {
        await supabase
          .from("kyc_documents")
          .upsert(rejectedPayload, { onConflict: "user_id,type" });
      } catch (dbErr) {
        console.error("[POST /api/kyc/webhook] Supabase decline update exception:", dbErr?.message);
      }

      // Send KYC rejection notification (non-blocking)
      createUserNotification(
        userId,
        "KYC Rejected 🪪 ❌",
        `We were unable to verify your identity document: ${declineReason || "Verification failed"}. Please upload a clear photo and try again.`,
        "warning"
      ).catch((err) => console.warn("[kyc/webhook] rejection notification failed:", err?.message));

      return res.json({ success: true, message: "KYC rejected updated" });
    }

    return res.json({ success: true, message: "Webhook received (no-op)" });
  } catch (err) {
    console.error("[POST /api/kyc/webhook] unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/kyc/electricity", async (req, res) => {
  try {
    const {
      user_id,
      consumer_name,
      consumer_number,
      board_name,
      address,
      file_url,
      status = "pending",
    } = req.body || {};

    if (!user_id || !consumer_name || !consumer_number || !board_name || !file_url) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (isDemoUser(user_id)) {
      return res.status(201).json({ success: true, data: { status: "pending", type: "electricity_bill" } });
    }

    const payload = {
      user_id,
      type: "electricity_bill",
      consumer_name,
      consumer_number,
      board_name,
      address: address || null,
      file_url,
      status,
    };

    let { data, error } = await supabase.from("kyc_documents").upsert([payload], { onConflict: "user_id,type" }).select().single();
    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = addKycDocument(payload);
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Also update users table column for fallback
    try {
      await supabase.from("users").update({ electricity_bill_url: file_url }).eq("id", user_id);
    } catch (dbErr) {
      console.warn("[kyc/electricity] users column update skipped:", dbErr?.message);
    }

    // Trigger submission notification (non-blocking)
    createUserNotification(
      user_id,
      "KYC Document Submitted 🪪",
      "Your Electricity Bill has been successfully submitted and is under review. We'll verify it shortly!",
      "info"
    ).catch((err) => console.warn("[kyc/electricity] submission notification failed:", err?.message));

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/kyc/driving-license", async (req, res) => {
  try {
    const { user_id, full_name, license_number, expiry_date, file_url, status = "pending" } = req.body || {};
    if (!user_id || !full_name || !license_number || !expiry_date || !file_url) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (isDemoUser(user_id)) {
      return res.status(201).json({ success: true, data: { status: "pending", type: "driving_license" } });
    }

    const payload = {
      user_id,
      type: "driving_license",
      consumer_name: full_name,
      consumer_number: license_number,
      board_name: "RTO",
      address: expiry_date,
      file_url,
      status,
    };

    let { data, error } = await supabase.from("kyc_documents").upsert([payload], { onConflict: "user_id,type" }).select().single();
    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = addKycDocument(payload);
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Also update users table column for fallback
    try {
      await supabase.from("users").update({ driving_license_url: file_url }).eq("id", user_id);
    } catch (dbErr) {
      console.warn("[kyc/driving-license] users column update skipped:", dbErr?.message);
    }

    // Trigger submission notification (non-blocking)
    createUserNotification(
      user_id,
      "KYC Document Submitted 🪪",
      "Your Driving License has been successfully submitted and is under review. We'll verify it shortly!",
      "info"
    ).catch((err) => console.warn("[kyc/driving-license] submission notification failed:", err?.message));

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.post("/kyc/upload", async (req, res) => {
  try {
    const { image_base64, file_name, content_type } = req.body || {};
    if (!image_base64) {
      return res.status(400).json({ success: false, message: "image_base64 is required" });
    }
    
    // Use root of kyc-documents bucket
    const safeName = String(file_name || `kyc-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safeName}`;
    
    const base64Data = String(image_base64).replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, buffer, { contentType: content_type || "image/jpeg", upsert: true });
      
    if (error) {
      console.error("[POST /api/kyc/upload] upload failed:", error);
      // Fallback to mock URL if storage bucket fails/missing
      const mockUrl = `https://kyc.bharbike.local/${path}`;
      return res.json({ 
        success: true, 
        url: mockUrl, 
        warning: "Storage bucket missing or upload failed — using mock URL fallback" 
      });
    }

    const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
    return res.json({ success: true, url: data?.publicUrl || null });
  } catch (err) {
    console.error("[POST /api/kyc/upload] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/kyc/electricity/status", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "");
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    if (isDemoUser(userId)) {
      return res.json({ success: true, data: null });
    }

    let { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("type", "electricity_bill")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = getLatestKycByUser(userId);
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/kyc/summary", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "");
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }

    if (isDemoUser(userId)) {
      return res.json({ success: true, data: { aadhaar: null, driving_license: null, electricity_bill: null, selfie: null, pan: null } });
    }

    let { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["aadhaar", "driving_license", "electricity_bill", "selfie", "pan"])
      .order("created_at", { ascending: false });

    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = listKycDocumentsByUser(userId);
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const rows = Array.isArray(data) ? data : [];
    const latestByType = {
      aadhaar: rows.find((x) => x.type === "aadhaar") || null,
      driving_license:
        rows.find((x) => x.type === "driving_license") || getLatestKycByUserAndType(userId, "driving_license"),
      electricity_bill:
        rows.find((x) => x.type === "electricity_bill") || getLatestKycByUserAndType(userId, "electricity_bill"),
      selfie: rows.find((x) => x.type === "selfie") || null,
      pan: rows.find((x) => x.type === "pan") || null,
    };

    // Also check users table columns for uploaded documents
    try {
      const { data: userProfile } = await supabase
        .from("users")
        .select("driving_license_url, aadhaar_front_url, aadhaar_back_url, pan_card_url, electricity_bill_url, selfie_url")
        .eq("id", userId)
        .maybeSingle();

      if (userProfile) {
        if (!latestByType.driving_license && userProfile.driving_license_url) {
          latestByType.driving_license = { type: "driving_license", status: "pending", file_url: userProfile.driving_license_url };
        }
        if (!latestByType.aadhaar && (userProfile.aadhaar_front_url || userProfile.aadhaar_back_url)) {
          latestByType.aadhaar = { type: "aadhaar", status: "pending", file_url: userProfile.aadhaar_front_url || userProfile.aadhaar_back_url };
        }
        if (!latestByType.electricity_bill && userProfile.electricity_bill_url) {
          latestByType.electricity_bill = { type: "electricity_bill", status: "pending", file_url: userProfile.electricity_bill_url };
        }
        if (!latestByType.selfie && userProfile.selfie_url) {
          latestByType.selfie = { type: "selfie", status: "pending", file_url: userProfile.selfie_url };
        }
        if (!latestByType.pan && userProfile.pan_card_url) {
          latestByType.pan = { type: "pan", status: "pending", file_url: userProfile.pan_card_url };
        }
      }
    } catch (e) {
      console.warn("[kyc/summary] users table check skipped:", e?.message);
    }

    return res.json({ success: true, data: latestByType });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /kyc/:field — remove a specific KYC document for a user
api.delete("/kyc/:field", async (req, res) => {
  try {
    const field = String(req.params.field || "").toLowerCase();
    const userId = String(req.query.user_id || "").trim();

    const ALLOWED_FIELDS = ["driving_license", "aadhaar_front", "aadhaar_back", "pan", "electricity_bill", "selfie"];
    if (!ALLOWED_FIELDS.includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid document field" });
    }
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }
    if (isDemoUser(userId)) {
      return res.json({ success: true, message: "Deleted (demo mode)" });
    }

    // Map field name to kyc_documents type
    const kycType = field === "electricity_bill" ? "electricity_bill"
      : field === "aadhaar_front" || field === "aadhaar_back" ? "aadhaar"
      : field;

    // Delete from kyc_documents table (non-blocking)
    try {
      await supabase.from("kyc_documents").delete().eq("user_id", userId).eq("type", kycType);
    } catch (e) {
      console.warn("[DELETE /kyc/:field] kyc_documents delete skipped:", e?.message);
    }

    // Clear the URL column in users table (non-blocking)
    const columnMap = {
      driving_license: "driving_license_url",
      aadhaar_front: "aadhaar_front_url",
      aadhaar_back: "aadhaar_back_url",
      pan: "pan_card_url",
      electricity_bill: "electricity_bill_url",
      selfie: "selfie_url",
    };
    const column = columnMap[field];
    if (column) {
      try {
        await supabase.from("users").update({ [column]: null }).eq("id", userId);
      } catch (e) {
        console.warn("[DELETE /kyc/:field] users column clear skipped:", e?.message);
      }
    }

    return res.json({ success: true, message: "Document removed" });
  } catch (err) {
    console.error("[DELETE /kyc/:field] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


api.get("/admin/kyc", async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("type", "electricity_bill")
      .order("created_at", { ascending: false });

    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = listKycDocuments();
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.patch("/admin/kyc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || "").toLowerCase();
    const reason = req.body?.reason || null;
    if (!["approved", "rejected", "verified"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const nextStatus = status === "approved" ? "verified" : status;

    let { data, error } = await supabase
      .from("kyc_documents")
      .update({ status: nextStatus, reason })
      .eq("id", id)
      .select()
      .single();

    if (error?.message?.toLowerCase().includes("could not find the table 'public.kyc_documents'")) {
      data = updateKycDocument(id, nextStatus, reason);
      if (!data) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      error = null;
    }
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Send KYC approval or rejection notification (non-blocking)
    if (data && data.user_id) {
      const isApproved = nextStatus === "verified" || nextStatus === "approved";
      createUserNotification(
        data.user_id,
        isApproved ? "KYC Approved! 🪪 ✅" : "KYC Rejected 🪪 ❌",
        isApproved
          ? "Congratulations! Your identity document has been verified. You can now unlock and ride any e-bike in our fleet!"
          : `We were unable to verify your identity document: ${reason || "Invalid document image"}. Please upload a clear photo and try again.`,
        isApproved ? "success" : "warning"
      ).catch((err) => console.warn("[admin/kyc/:id] status notification failed:", err?.message));
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.use("/delivery", deliveryRoutes);

api.post("/rentals", async (req, res) => {
  try {
    const { bike_id, user_id, duration, start_time, status } = req.body || {};

    if (!bike_id || !user_id) {
      return res.status(400).json({ message: "Missing data" });
    }

    const basePayload = {
      bike_id,
      user_id,
      duration: duration || null,
      start_time: start_time || new Date().toISOString(),
      status: status || "active",
    };

    let { data, error } = await supabase.from("rentals").insert([basePayload]).select();
    if (error?.message?.toLowerCase().includes("could not find the table 'public.rentals'")) {
      ({ data, error } = await supabase
        .from("bookings")
        .insert([
          {
            ...basePayload,
            end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            price: 0,
          },
        ])
        .select());
      if (error?.message?.toLowerCase().includes("could not find the table 'public.bookings'")) {
        ({ data, error } = await supabase
          .from("orders")
          .insert([
            {
              bike_id: bike_id,
              user_id: user_id,
              pickup_location: "App Booking",
              drop_location: "App Booking",
              status: status || "pending",
              earnings: 0,
            },
          ])
          .select());
      }
    }

    if (error) {
      const fallbackBooking = addInMemoryBooking(basePayload);
      return res.json({
        success: true,
        booking: [fallbackBooking],
        source: "in-memory-fallback",
        note: "Supabase booking tables missing; using temporary in-memory storage",
      });
    }

    return res.json({ success: true, booking: data, source: "supabase" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

api.get("/rentals", async (req, res) => {
  const userId = String(req.query.user_id || "");
  const status = String(req.query.status || "");

  let query = supabase
    .from("rentals")
    .select("*, bikes(id, name, image_url, price)")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);
  if (status) query = query.eq("status", status);

  let { data, error } = await query;

  if (error?.message?.toLowerCase().includes("could not find the table 'public.rentals'")) {
    let fallbackQuery = supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (userId) fallbackQuery = fallbackQuery.eq("user_id", userId);
    ({ data, error } = await fallbackQuery);
    if (error?.message?.toLowerCase().includes("could not find the table 'public.bookings'")) {
      let orderQuery = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (userId) orderQuery = orderQuery.eq("user_id", userId);
      ({ data, error } = await orderQuery);
    }
  }

  if (error) {
    return res.json(listInMemoryBookings());
  }

  return res.json(data || []);
});

api.get("/admin/health", async (req, res) => {
  try {
    const [users, bikes, rentals, kycCountRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("bikes").select("id", { count: "exact", head: true }),
      supabase.from("rentals").select("id", { count: "exact", head: true }),
      supabase.from("kyc_documents").select("id", { count: "exact", head: true }),
    ]);

    return res.json({
      status: "Running",
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      cpu: process.cpuUsage().user / 1000000,
      users: users.count || 0,
      bikes: bikes.count || 0,
      rentals: rentals.count || 0,
      kycCount: kycCountRes.count || 0,
      supabaseKeyType: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key (RLS Bypassed)" : "Anon Key (Subject to RLS)",
      supabaseUrl: process.env.SUPABASE_URL || "not set",
      supabaseKeyLength: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Health check failed" });
  }
});

api.get("/social-links", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data || !data.settings) {
      return res.json({
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        twitter: "https://twitter.com",
        linkedin: "https://linkedin.com",
        youtube: "https://youtube.com",
        companyName: "BHAR BIKE",
        phone: "9167969692",
        email: "info@bharbike.com",
        address: "IRMRI Training & Extension Center, Arise Incubation, Plot no B88, Road no 24/U1, Wagle Industrial Estate, Thane 400604, MH."
      });
    }

    const s = data.settings;
    return res.json({
      facebook: s.socialFacebook || "https://facebook.com",
      instagram: s.socialInstagram || "https://instagram.com",
      twitter: s.socialTwitter || "https://twitter.com",
      linkedin: s.socialLinkedin || "https://linkedin.com",
      youtube: s.socialYoutube || "https://youtube.com",
      companyName: s.companyName || "BHAR BIKE",
      phone: s.phone || "9167969692",
      email: s.supportEmail || "info@bharbike.com",
      address: s.address || "IRMRI Training & Extension Center, Arise Incubation, Plot no B88, Road no 24/U1, Wagle Industrial Estate, Thane 400604, MH."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch social links" });
  }
});

export default api;
