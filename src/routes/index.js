import { Router } from "express";
import multer from "multer";

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
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import supabase from "../utils/supabaseClient.js";
import os from "os";
import { adminApiLogin } from "../controllers/adminAuthController.js";
import { requireAdminAuth } from "../admin/middleware/adminAuth.js";
import { apiJsonAdminOrders, apiJsonAdminPayments } from "../admin/controllers/adminController.js";
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
  driving_license: "driving_license_url", // Added driving license mapping
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
api.use("/payment", paymentMethodRoutes);
api.use("/skipped-days", skippedDaysRoutes);
api.use("/subscription", subscriptionRoutes);
api.use("/", trackingRoutes);
api.use("/", bookingRoutes);
api.get("/bookings", authMiddleware, rentalController.bookings);

// Payment Routes
api.post("/payment/create-order", authMiddleware, asyncHandler(paymentController.createOrder));
api.post("/payment/verify", authMiddleware, asyncHandler(paymentController.verifyPayment));
api.post("/create-order", asyncHandler(paymentController.createOrder));
api.post("/verify-payment", asyncHandler(paymentController.verifyPayment));

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

    if (error) {
      console.error("[GET /api/orders] failed:", error);
      return res.status(500).json({ success: false, message: error.message });
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

    let tracking_link = null;
    let vehicle_id = null;

    // Optional Loconav integration on accept.
    const token = String(process.env.LOCONAV_USER_AUTH_TOKEN || "").trim();
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
          await axios.get(`https://api.a.loconav.com/integration/api/v1/vehicles/${vehicle.vehicle_uuid}`, {
            headers,
          });
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

// Payment Admin Routes
api.use("/admin/payment", adminPaymentRoutes);
api.post("/admin/payment-config", asyncHandler(paymentAdminController.addConfig));

api.get("/admin/health", async (req, res) => {
  try {
    const [profilesCountRes, bikesCountRes, rentalsCountRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("bikes").select("*", { count: "exact", head: true }),
      supabase.from("rentals").select("*", { count: "exact", head: true }),
    ]);

    if (profilesCountRes.error || bikesCountRes.error || rentalsCountRes.error) {
      return res.status(500).json({
        status: "error",
        message:
          profilesCountRes.error?.message ||
          bikesCountRes.error?.message ||
          rentalsCountRes.error?.message ||
          "Database stats failed",
      });
    }

    return res.json({
      status: "running",
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      cpu: os.loadavg()[0],
      platform: process.platform,
      node_version: process.version,
      users: profilesCountRes.count || 0,
      bikes: bikesCountRes.count || 0,
      rentals: rentalsCountRes.count || 0,
    });
  } catch (error) {
    console.error("[GET /api/admin/health]", error);
    return res.status(500).json({ status: "error", message: "Server not responding ❌" });
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

    if (!user_id || !(full_name || name) || !phone || !city || !vehicle_type || !license_number || !aadhar_number) {
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
      phone,
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
    const userId = String(req.params.userId || "");
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }
    if (isDemoUser(userId)) {
      return res.json({ success: true, data: [] });
    }
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[GET /api/support/user/:userId] failed:", error);
      return res.status(500).json({ success: false, message: error.message || "Fetch failed" });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[GET /api/support/user/:userId] unexpected:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

api.get("/admin/support", async (req, res) => {
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

api.put("/admin/support/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || "").toLowerCase();
    if (!["pending", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const { data, error } = await supabase
      .from("support_tickets")
      .update({ status })
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
      return res.json({ success: true, url: `https://demo.example.com/${type}_mock.jpg`, type });
    }

    if (!Object.prototype.hasOwnProperty.call(DOC_TYPE_TO_COLUMN, type)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only jpg, png, pdf allowed" });
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

    return res.status(201).json({ success: true, data });
  } catch (err) {
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
      return res.json({ success: true, data: { aadhaar: null, driving_license: null, electricity_bill: null, selfie: null } });
    }

    let { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["aadhaar", "driving_license", "electricity_bill", "selfie"])
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
      }
    } catch (e) {
      console.warn("[kyc/summary] users table check skipped:", e?.message);
    }

    return res.json({ success: true, data: latestByType });
  } catch (err) {
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

export default api;
