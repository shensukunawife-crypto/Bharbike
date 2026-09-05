import supabase from "../utils/supabaseClient.js";
import { createUserNotification } from "../services/notificationService.js";
import { getWalletBalance } from "../services/walletService.js";
import { hasActiveSubscription } from "../services/subscriptionService.js";

export const createBooking = async (req, res) => {
  try {
    const {
      user_id,
      bike_id,
      duration,
      start_time,
      end_time,
      price,
      status = "active",
    } = req.body ?? {};

    if (!user_id || !bike_id || !duration || !start_time || !end_time || price == null) {
      return res.status(400).json({ message: "Missing required booking fields" });
    }

    // 1. Strict Subscription Verification — Must have an active paid plan
    const hasSub = await hasActiveSubscription(user_id);
    if (!hasSub) {
      return res.status(403).json({
        message: "An active subscription is required to book a bike. Please choose a subscription plan first."
      });
    }

    // 2. Check if user already has an active booking
    const { data: activeBooking } = await supabase
      .from("rentals")
      .select("id")
      .eq("user_id", user_id)
      .in("status", ["active", "ongoing"])
      .maybeSingle();

    if (activeBooking) {
      return res.status(400).json({ message: "You already have an active booking." });
    }

    // 3. Check if bike is available and valid
    const { data: bike } = await supabase
      .from("bikes")
      .select("id, bike_code, status, is_locked")
      .eq("id", bike_id)
      .maybeSingle();

    if (!bike) {
      return res.status(404).json({ message: "Bike not found." });
    }

    if (bike.status !== "available" && !String(bike_id).includes("demo")) {
      return res.status(400).json({ message: `Bike ${bike.bike_code || `#${bike_id}`} is currently unavailable or already in use.` });
    }

    // 4. Check wallet balance
    const wallet = await getWalletBalance(user_id);
    if (wallet && wallet.balance < 0) {
      return res.status(402).json({
        message: `Your wallet balance is negative (₹${wallet.balance}). Please clear pending dues before booking.`
      });
    }

    const bookingPrice = Number(price) || 0;
    if (bookingPrice > 0 && wallet && wallet.balance < bookingPrice) {
      return res.status(402).json({
        message: `Insufficient wallet balance. Required: ₹${bookingPrice}, Available: ₹${wallet.balance}. Please recharge your wallet.`
      });
    }

    const parsedDuration = parseInt(String(duration).replace(/[^0-9]/g, "")) || 0;

    const payload = {
      user_id,
      bike_id,
      duration: parsedDuration,
      start_time,
      end_time,
      price: bookingPrice,
      status,
    };

    // 5. Create the booking (now stored in rentals)
    const { data, error } = await supabase.from("rentals").insert([payload]).select();

    if (error) {
      return res.status(500).json({ message: error.message, code: error.code });
    }

    // Send Booking Confirmed Notification (non-blocking)
    createUserNotification(
      user_id,
      "Booking Confirmed! 📅",
      `Your booking for Bike ${bike.bike_code || `#${bike_id}`} is confirmed. Start your ride from the app to unlock the smart lock.`,
      "success"
    ).catch((err) => console.warn("[bookingController.createBooking] notification failed:", err?.message));

    // Warn if wallet balance is low after booking (non-blocking)
    if (wallet && wallet.balance < 150) {
      createUserNotification(
        user_id,
        "Low Wallet Balance Alert ⚠️",
        `Your wallet balance is low (₹${wallet.balance}). We recommend topping up to ensure a smooth, uninterrupted ride!`,
        "warning"
      ).catch(() => {});
    }

    // 6. Update bike status to in_use
    if (!String(bike_id).includes("demo")) {
      await supabase
        .from("bikes")
        .update({ status: "in_use" })
        .eq("id", bike_id);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("[createBooking] error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

export const getBookingsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message, code: error.code });
    }

    return res.status(200).json(data ?? []);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
