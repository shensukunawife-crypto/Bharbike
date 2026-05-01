import supabase from "../utils/supabaseClient.js";
import * as iot from "../services/iotService.js";

/**
 * Admin workflow story: after Razorpay verify, a paid order exists.
 * This endpoint finds the latest successful payment, confirms the order is paid,
 * moves order → ongoing (ride started), and triggers IoT unlock when bike_id exists.
 */
export async function postStoryUnlock(req, res) {
  try {
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, status, order_id")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payErr) {
      console.error("[postStoryUnlock] payments query:", payErr);
      return res.status(500).json({ verified: false, message: payErr.message });
    }

    if (!payment?.order_id) {
      return res.status(200).json({
        verified: false,
        message: "No verified payment found — complete a checkout first.",
      });
    }

    const { data: order, error: ordErr } = await supabase
      .from("orders")
      .select("id, status, bike_id")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (ordErr || !order) {
      console.error("[postStoryUnlock] order fetch:", ordErr);
      return res.status(200).json({ verified: false, message: "Linked order not found." });
    }

    const paidLike = ["paid", "pending"];
    const activeLike = ["ongoing", "completed"];

    if (activeLike.includes(order.status)) {
      if (order.bike_id) {
        await iot.unlockBike(order.bike_id);
      }
      return res.status(200).json({
        verified: true,
        rideStatus: "Ride Started",
        orderId: order.id,
        alreadyActive: true,
      });
    }

    if (!paidLike.includes(order.status)) {
      return res.status(200).json({
        verified: false,
        message: `Order status “${order.status}” — payment must be verified first.`,
      });
    }

    const { error: updErr } = await supabase.from("orders").update({ status: "ongoing" }).eq("id", order.id);

    if (updErr) {
      console.error("[postStoryUnlock] order update:", updErr);
      return res.status(500).json({ verified: false, message: updErr.message });
    }

    if (order.bike_id) {
      await iot.unlockBike(order.bike_id);
    }

    return res.status(200).json({
      verified: true,
      rideStatus: "Ride Started",
      orderId: order.id,
      alreadyActive: false,
    });
  } catch (err) {
    console.error("[postStoryUnlock]", err);
    return res.status(500).json({ verified: false, message: err?.message || "Unlock failed" });
  }
}
