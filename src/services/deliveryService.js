import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";

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

  return { status: "review", message: "Application submitted successfully for review" };
}

export async function setPartnerOnline(userId, isOnline) {
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (fetchError) {
    console.error("[deliveryService.setPartnerOnline] fetch failed", fetchError);
    throw new AppError("Unable to update online status", 500);
  }
  if (!user?.is_delivery_partner) {
    throw new AppError("Only approved partners can set online status", 403);
  }
  const { error: updateError } = await supabase
    .from("users")
    .update({ is_online: isOnline })
    .eq("id", userId);
  if (updateError) {
    console.error("[deliveryService.setPartnerOnline] update failed", updateError);
    throw new AppError("Unable to update online status", 500);
  }
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
