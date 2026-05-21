import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { createUserNotification } from "./notificationService.js";

export async function applyForDelivery(userId, partnerData = {}) {
  if (!userId) {
    throw new AppError("user_id is required", 400);
  }

  const { data: existing, error: fetchError } = await supabase
    .from("delivery_partners")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deliveryService.applyForDelivery] fetch failed", fetchError);
    throw new AppError("Unable to submit application", 500);
  }

  if (existing?.status === "approved") {
    return { status: "approved", message: "Already approved delivery partner" };
  }

  const payload = {
    user_id: userId,
    status: "review",
    full_name: partnerData.full_name || partnerData.name,
    email: partnerData.email,
    phone: partnerData.phone,
    city: partnerData.city,
    vehicle_type: partnerData.vehicle_type,
    license_number: partnerData.license_number,
    aadhar_number: partnerData.aadhar_number,
    license_url: partnerData.license_url,
    aadhar_url: partnerData.aadhar_url,
    photo_url: partnerData.photo_url,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("delivery_partners")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) {
      console.error("[deliveryService.applyForDelivery] update failed", updateError);
      throw new AppError("Unable to update application", 500);
    }
  } else {
    const { error: createError } = await supabase
      .from("delivery_partners")
      .insert([payload]);
    if (createError) {
      console.error("[deliveryService.applyForDelivery] create failed", createError);
      throw new AppError("Unable to submit application", 500);
    }
  }

  // Send KYC Submission Notification (non-blocking)
  createUserNotification(
    userId,
    "KYC Application Under Review 📄",
    "Your delivery partner application has been submitted successfully. We are reviewing your Aadhaar & Driving License. Expect approval within 24 hours!",
    "kyc"
  ).catch((err) => console.warn("[deliveryService.applyForDelivery] submission notification failed:", err?.message));

  return { status: "review", message: "Application submitted successfully for review" };
}

export async function setPartnerOnline(userId, isOnline) {
  // Check if partner exists and is approved
  const { data: partner, error: fetchError } = await supabase
    .from("delivery_partners")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deliveryService.setPartnerOnline] fetch failed", fetchError);
    throw new AppError("Unable to update online status", 500);
  }

  if (!partner || partner.status !== "approved") {
    throw new AppError("Only approved partners can set online status", 403);
  }

  // Update online status in delivery_partners table
  const { error: updateError } = await supabase
    .from("delivery_partners")
    .update({ is_online: isOnline })
    .eq("user_id", userId);

  if (updateError) {
    console.error("[deliveryService.setPartnerOnline] update failed", updateError);
    throw new AppError("Unable to update online status", 500);
  }

  // Send status update notification (non-blocking)
  createUserNotification(
    userId,
    isOnline ? "You are Online 🟢" : "You are Offline 🔴",
    isOnline 
      ? "Your status is now online. You will receive bike delivery jobs in your area." 
      : "Your status is now offline. You will no longer receive delivery jobs.",
    "info"
  ).catch((err) => console.warn("[deliveryService.setPartnerOnline] notification failed:", err?.message));

  return { is_online: isOnline };
}

export async function getDeliveryStatus(userId) {
  if (!userId) {
    throw new AppError("user_id is required", 400);
  }

  const { data, error } = await supabase
    .from("delivery_partners")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[deliveryService.getDeliveryStatus] failed", error);
    throw new AppError("Unable to fetch delivery status", 500);
  }

  return { status: data?.status || null };
}

export async function getPartnerDashboard(userId) {
  if (!userId) throw new AppError("user_id is required", 400);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get partner info + online status
  const { data: partner } = await supabase
    .from("delivery_partners")
    .select("full_name, status, is_online, city, vehicle_type, rating")
    .eq("user_id", userId)
    .maybeSingle();

  // Get today's completed orders
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id, earnings, status, created_at")
    .eq("assigned_user_id", userId)
    .eq("status", "completed")
    .gte("created_at", today.toISOString());

  // Get all-time completed orders count
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("assigned_user_id", userId)
    .eq("status", "completed");

  // Get active order if any
  const { data: activeOrder } = await supabase
    .from("orders")
    .select("id, plan_name, pickup, drop_location, earnings, status")
    .eq("assigned_user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  // Today's earnings
  const todayEarnings = (todayOrders || []).reduce(
    (sum, o) => sum + Number(o.earnings || 0), 0
  );

  // Get earnings from earnings table for total
  const { data: earningsRows } = await supabase
    .from("earnings")
    .select("amount, created_at")
    .eq("user_id", userId);

  const totalEarnings = (earningsRows || []).reduce(
    (sum, e) => sum + Number(e.amount || 0), 0
  );

  // This week's earnings
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weekEarnings = (earningsRows || [])
    .filter(e => new Date(e.created_at) >= weekStart)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    partner: partner || {},
    todayEarnings: Number(todayEarnings.toFixed(2)),
    weekEarnings: Number(weekEarnings.toFixed(2)),
    totalEarnings: Number(totalEarnings.toFixed(2)),
    todayOrders: (todayOrders || []).length,
    totalOrders: totalOrders || 0,
    activeOrder: activeOrder || null,
    isOnline: partner?.is_online ?? false,
  };
}

export async function getPartnerOrders(userId) {
  if (!userId) throw new AppError("user_id is required", 400);
  const { data, error } = await supabase
    .from("orders")
    .select("id, plan_name, pickup, drop_location, earnings, status, created_at")
    .eq("assigned_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[deliveryService.getPartnerOrders] failed", error);
    return [];
  }
  return data || [];
}

export async function getPartnerEarnings(userId) {
  if (!userId) throw new AppError("user_id is required", 400);
  const { data, error } = await supabase
    .from("earnings")
    .select("id, amount, type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[deliveryService.getPartnerEarnings] failed", error);
    return [];
  }
  return data || [];
}
