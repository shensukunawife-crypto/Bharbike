import supabase from "../config/supabase.js";
import { OrderStatus, EarningsType } from "../constants/dbEnums.js";
import { AppError } from "../utils/AppError.js";
import * as earningsService from "./earningsService.js";
import { createUserNotification } from "./notificationService.js";

async function assertPartnerEligible(userId) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[orderService.assertPartnerEligible] failed", error);
    throw new AppError("Unable to verify partner status", 500);
  }
  if (!user?.is_delivery_partner) {
    throw new AppError("Delivery partner features not enabled", 403);
  }
  if (!user.is_online) {
    throw new AppError("Go online to see and accept orders", 403);
  }
}

export async function listAvailableOrders(userId) {
  await assertPartnerEligible(userId);
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", OrderStatus.pending)
    .is("assigned_user_id", null)
    .order("createdAt", { ascending: true });
  if (error) {
    console.error("[orderService.listAvailableOrders] failed", error);
    throw new AppError("Unable to fetch orders", 500);
  }
  return data;
}

export async function acceptOrder(userId, orderId) {
  await assertPartnerEligible(userId);

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("status", OrderStatus.pending)
    .is("assigned_user_id", null)
    .maybeSingle();
  if (fetchError) {
    console.error("[orderService.acceptOrder] fetch failed", fetchError);
    throw new AppError("Unable to accept order", 500);
  }
  if (!order) {
    throw new AppError("Order not available", 409);
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ assigned_user_id: userId, status: OrderStatus.accepted })
    .eq("id", orderId)
    .select("*")
    .single();
  if (updateError) {
    console.error("[orderService.acceptOrder] update failed", updateError);
    throw new AppError("Unable to accept order", 500);
  }

  // Notify delivery partner (non-blocking)
  createUserNotification(
    userId,
    "Delivery Job Accepted 📦",
    `You have successfully accepted Delivery Order #${orderId}. Please proceed to the pickup location: ${updated.pickup || "the designated hub"}.`,
    "info"
  ).catch((err) => console.warn("[orderService.acceptOrder] partner notification failed:", err?.message));

  // Notify customer if associated with order (non-blocking)
  if (updated.user_id) {
    createUserNotification(
      updated.user_id,
      "Delivery Partner Assigned 🚚",
      `A delivery partner has been assigned to your order #${orderId} and is on their way to deliver your bike!`,
      "info"
    ).catch((err) => console.warn("[orderService.acceptOrder] customer notification failed:", err?.message));
  }

  return updated;
}

export async function rejectOrder(userId, orderId) {
  await assertPartnerEligible(userId);

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("assigned_user_id", userId)
    .eq("status", OrderStatus.accepted)
    .maybeSingle();
  if (fetchError) {
    console.error("[orderService.rejectOrder] fetch failed", fetchError);
    throw new AppError("Unable to reject order", 500);
  }
  if (!order) {
    throw new AppError("No active assignment for this order", 409);
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ assigned_user_id: null, status: OrderStatus.pending })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) {
    console.error("[orderService.rejectOrder] update failed", error);
    throw new AppError("Unable to reject order", 500);
  }

  // Notify delivery partner (non-blocking)
  createUserNotification(
    userId,
    "Delivery Job Released 🔄",
    `Delivery Order #${orderId} has been successfully returned to the active orders pool.`,
    "info"
  ).catch((err) => console.warn("[orderService.rejectOrder] partner notification failed:", err?.message));

  // Notify customer if associated with order (non-blocking)
  if (data.user_id) {
    createUserNotification(
      data.user_id,
      "Delivery Order Updated ⏳",
      `Your delivery order #${orderId} assignment has changed. We are matching you with another delivery partner shortly.`,
      "warning"
    ).catch((err) => console.warn("[orderService.rejectOrder] customer notification failed:", err?.message));
  }

  return data;
}

export async function completeOrder(userId, orderId) {
  await assertPartnerEligible(userId);

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("assigned_user_id", userId)
    .eq("status", OrderStatus.accepted)
    .maybeSingle();
  if (fetchError) {
    console.error("[orderService.completeOrder] fetch failed", fetchError);
    throw new AppError("Unable to complete order", 500);
  }
  if (!order) {
    throw new AppError("Order not in accepted state for you", 409);
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: OrderStatus.completed })
    .eq("id", orderId);
  if (updateError) {
    console.error("[orderService.completeOrder] update failed", updateError);
    throw new AppError("Unable to complete order", 500);
  }

  await earningsService.recordEarning(userId, Number(order.earnings), EarningsType.delivery);

  const { data: updatedOrder, error: refetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (refetchError) {
    console.error("[orderService.completeOrder] refetch failed", refetchError);
    throw new AppError("Order completed but unable to fetch latest data", 500);
  }

  // Notify delivery partner of earnings (non-blocking)
  createUserNotification(
    userId,
    "Delivery Completed! 💰",
    `Great job! Delivery Order #${orderId} was completed successfully. ₹${updatedOrder.earnings} has been credited to your delivery earnings.`,
    "success"
  ).catch((err) => console.warn("[orderService.completeOrder] partner notification failed:", err?.message));

  // Notify customer if associated with order (non-blocking)
  if (updatedOrder.user_id) {
    createUserNotification(
      updatedOrder.user_id,
      "Your Bike Has Arrived! 🚲",
      `Awesome news! Your delivery order #${orderId} is complete and your bike has been delivered to your location. Ready to ride?`,
      "success"
    ).catch((err) => console.warn("[orderService.completeOrder] customer notification failed:", err?.message));
  }

  return updatedOrder;
}
