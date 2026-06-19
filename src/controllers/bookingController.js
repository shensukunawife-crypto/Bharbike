import supabase from "../utils/supabaseClient.js";
import { createUserNotification } from "../services/notificationService.js";
import { getWalletBalance } from "../services/walletService.js";

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

    // 1. Check if user already has an active booking
    const { data: activeBooking } = await supabase
      .from("rentals")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .maybeSingle();

    if (activeBooking) {
      return res.status(400).json({ message: "You already have an active booking." });
    }

    // 2. Check if bike is already in use
    const { data: bike } = await supabase
      .from("bikes")
      .select("status")
      .eq("id", bike_id)
      .maybeSingle();

    if (bike?.status !== "available" && !String(bike_id).includes("demo")) {
      return res.status(400).json({ message: "This bike is currently unavailable." });
    }

    const parsedDuration = parseInt(String(duration).replace(/[^0-9]/g, "")) || 0;

    const payload = {
      user_id,
      bike_id,
      duration: parsedDuration,
      start_time,
      end_time,
      price,
      status,
    };

    // 3. Create the booking (now stored in rentals)
    const { data, error } = await supabase.from("rentals").insert([payload]).select();

    if (error) {
      return res.status(500).json({ message: error.message, code: error.code });
    }

    // Send Booking Confirmed Notification (non-blocking)
    createUserNotification(
      user_id,
      "Booking Confirmed! 📅",
      `Your booking for Bike #${bike_id} is confirmed. Start your ride from the app to unlock the smart lock.`,
      "success"
    ).catch((err) => console.warn("[bookingController.createBooking] notification failed:", err?.message));

    // Check wallet balance and notify if low (non-blocking)
    getWalletBalance(user_id)
      .then((wallet) => {
        if (wallet && wallet.balance < 150) {
          createUserNotification(
            user_id,
            "Low Wallet Balance Alert ⚠️",
            `Your wallet balance is low (₹${wallet.balance}). We recommend topping up to ensure a smooth, uninterrupted ride!`,
            "warning"
          ).catch(() => {});
        }
      })
      .catch((err) => console.warn("[bookingController.createBooking] wallet check skipped (non-blocking):", err?.message));

    // 4. Update bike status to in_use
    if (!String(bike_id).includes("demo")) {
      await supabase
        .from("bikes")
        .update({ status: "in_use" })
        .eq("id", bike_id);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("[createBooking] error:", err);
    return res.status(500).json({ message: "Server error" });
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
