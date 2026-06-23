import supabase from "../config/supabase.js";
import {
  BikeStatus,
  EarningsType,
  RentalPlan,
  RentalStatus,
} from "../constants/dbEnums.js";
import { AppError } from "../utils/AppError.js";
import { pickFirstAvailableBike } from "./bikeService.js";
import * as iot from "./iotService.js";
import * as earningsService from "./earningsService.js";
import { createUserNotification } from "./notificationService.js";
import { getWalletBalance, deductMoney } from "./walletService.js";
import { hasActiveSubscription } from "./subscriptionService.js";

const PLAN_MS = {
  [RentalPlan.daily]: 24 * 60 * 60 * 1000,
  [RentalPlan.weekly]: 7 * 24 * 60 * 60 * 1000,
  [RentalPlan.monthly]: 30 * 24 * 60 * 60 * 1000,
};

const PLAN_HOURS = {
  [RentalPlan.daily]: 24,
  [RentalPlan.weekly]: 24 * 7,
  [RentalPlan.monthly]: 24 * 30,
};

const PLAN_PRICE = {
  [RentalPlan.daily]: 100,
  [RentalPlan.weekly]: 500,
  [RentalPlan.monthly]: 1500,
};

let rentalsTableMissingLogged = false;

function isRentalsTableMissing(error) {
  return error?.code === "PGRST205" || String(error?.message || "").includes("public.rentals");
}

function addPlanDuration(start, plan) {
  return new Date(start.getTime() + PLAN_MS[plan]);
}

export async function startRental(userId, plan) {
  // 0. Wallet / Subscription Verification
  const hasSub = await hasActiveSubscription(userId);
  if (!hasSub) {
    const wallet = await getWalletBalance(userId);
    if (wallet.balance < 50) {
      throw new AppError("Insufficient wallet balance. Please maintain a minimum balance of ₹50 or buy a subscription to ride.", 402);
    }
  }

  // 1. Strict Active Rental Check — check both 'active' and 'ongoing' statuses
  const { data: active, error: activeError } = await supabase
    .from("rentals")
    .select("id")
    .eq("user_id", userId)
    .in("status", [RentalStatus.active, RentalStatus.ongoing])
    .maybeSingle();

  if (activeError && !isRentalsTableMissing(activeError)) {
    console.error("[rentalService.startRental] active check failed:", activeError);
    throw new AppError("Unable to verify active rentals. Please try again.", 500);
  }
  
  if (active) {
    throw new AppError("You already have an active rental", 409);
  }

  // 2. Pick Bike
  const bike = await pickFirstAvailableBike();
  if (!bike || bike.status !== BikeStatus.available) {
    throw new AppError("No bikes available at this hub", 409);
  }

  const startTime = new Date();
  const endTime = addPlanDuration(startTime, plan);

  // 3. Atomic Bike Claim (Race Condition Protection)
  const { data: claimedBike, error: claimError } = await supabase
    .from("bikes")
    .update({ status: BikeStatus.in_use })
    .eq("id", bike.id)
    .eq("status", BikeStatus.available)
    .select()
    .maybeSingle();

  if (claimError || !claimedBike) {
    throw new AppError("Bike was just rented by someone else. Please try again.", 409);
  }

  // 4. IoT Unlock (Before creating rental)
  try {
    await iot.unlockBike(bike.id);
  } catch (iotErr) {
    console.log("[rentalService] IoT unlock failed/skipped, rolling back if not demo:", iotErr.message);
    // In production, if IoT fails, we MUST rollback. In demo, we might want to continue.
    // If it's a real failure (not just "missing env var"), we should abort.
    if (iotErr.message !== "LOCONAV_API_URL not configured") {
      await supabase.from("bikes").update({ status: BikeStatus.available }).eq("id", bike.id);
      throw new AppError("Failed to unlock the physical bike. Please try another.", 500);
    }
  }

  // 5. Create Rental Record
  const rentalPrice = PLAN_PRICE[plan] || 0;
  const { data: rental, error: createError } = await supabase
    .from("rentals")
    .insert([
      {
        user_id: userId,
        bike_id: bike.id,
        duration: PLAN_HOURS[plan],
        price: rentalPrice,           // ← always set the price
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: RentalStatus.ongoing, // ← use 'ongoing' to match mobile app
      },
    ])
    .select("*")
    .single();

  if (createError) {
    console.error("[rentalService.startRental] rental create failed", JSON.stringify(createError));
    // Rollback bike if rental creation failed
    await supabase.from("bikes").update({ status: BikeStatus.available }).eq("id", bike.id);
    
    // Fallback for missing table in demo
    if (isRentalsTableMissing(createError)) {
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        bike_id: bike.id,
        duration: PLAN_HOURS[plan],
        price: PLAN_PRICE[plan],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: RentalStatus.active,
      };
    }
    throw new AppError(`Unable to start rental: ${createError.message}`, 500);
  }

  // Send Ride Started Notification (non-blocking)
  createUserNotification(
    userId,
    "Ride Started Successfully! 🚲",
    "Your rental is active. Please ride safely, wear a helmet, and follow local traffic regulations.",
    "info"
  ).catch((err) => console.warn("[rentalService.startRental] notification failed:", err?.message));

  return rental;
}

async function finalizeRental(rentalId, status) {
  const { data: rental, error: rentalError } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .maybeSingle();
  if (rentalError) {
    console.error("[rentalService.finalizeRental] fetch failed", rentalError);
    throw new AppError("Unable to end rental", 500);
  }
  if (!rental) {
    throw new AppError("Rental not found", 404);
  }
  // Accept both 'active' and 'ongoing' — mobile app uses 'ongoing'
  const isActiveRental = ['active', 'ongoing'].includes(rental.status);
  if (!isActiveRental) {
    throw new AppError("Rental is not active", 409);
  }

  const { error: rentUpdateErr } = await supabase.from("rentals").update({ 
    status,
    end_time: new Date().toISOString()
  }).eq("id", rentalId);
  if (rentUpdateErr) throw new AppError(`Failed to end rental: ${rentUpdateErr.message}`, 500);

  const { error: bikeUpdateErr } = await supabase.from("bikes").update({ 
    status: BikeStatus.available,
    is_locked: true 
  }).eq("id", rental.bike_id);
  if (bikeUpdateErr) throw new AppError(`Failed to release bike: ${bikeUpdateErr.message}`, 500);

  // Skip IoT lock if not configured (demo mode)
  try {
    await iot.lockBike(rental.bike_id);
  } catch (iotErr) {
    console.log("[rentalService] IoT lock skipped (not configured):", iotErr.message);
  }

  // Deduct Wallet Balance (if no active subscription)
  const amount = rental.price || 0;
  let chargeApplied = 0;
  
  if (status !== RentalStatus.expired) { // Don't charge for just expiring it if they already paid or it's forced
    try {
      const hasSub = await hasActiveSubscription(rental.user_id);
      if (!hasSub && amount > 0) {
        await deductMoney(rental.user_id, amount, "Ride completed", `Charge for bike #${rental.bike_id}`);
        chargeApplied = amount;
      }
    } catch (err) {
      console.warn("[rentalService.finalizeRental] wallet deduction failed:", err?.message);
      // Even if wallet deduction fails (e.g. negative balance), we still end the ride to free the bike
    }
  }

  // Record earning — non-blocking if it fails
  try {
    if (chargeApplied > 0) {
      await earningsService.recordEarning(rental.user_id, chargeApplied, EarningsType.rental);
    }
  } catch (earnErr) {
    console.warn("[rentalService.finalizeRental] earning record skipped (non-blocking):", earnErr?.message);
  }

  // Send notification based on status (non-blocking)
  const isExpired = status === RentalStatus.expired;
  const notifTitle = isExpired ? "Rental Subscription Expired ⚠️" : "Ride Completed Successfully! 🏁";
  const notifMsg = isExpired 
    ? `Your rental period for Bike #${rental.bike_id || "bike"} has expired. Please return and lock the bike at the nearest hub.`
    : `Your rental has ended. Thank you for riding with BHAR BIKE! We charged you ₹${amount}. Check your stats under the dashboard.`;
  const notifType = isExpired ? "warning" : "success";

  createUserNotification(
    rental.user_id,
    notifTitle,
    notifMsg,
    notifType
  ).catch((err) => console.warn("[rentalService.finalizeRental] notification failed:", err?.message));

  return { rentalId, status, rentalEarning: amount };
}

export async function endRental(userId, rentalId) {
  const { data: rental, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[rentalService.endRental] failed", error);
    throw new AppError("Unable to end rental", 500);
  }
  if (!rental) {
    throw new AppError("Rental not found", 404);
  }
  return finalizeRental(rental.id, RentalStatus.ended);
}

export async function expireRentalsPastEnd() {
  const now = new Date();
  // Query for both 'active' and 'ongoing' — mobile app uses 'ongoing'
  const { data: due, error } = await supabase
    .from("rentals")
    .select("*")
    .in("status", [RentalStatus.active, RentalStatus.ongoing])
    .lt("end_time", now.toISOString());
  if (error) {
    if (isRentalsTableMissing(error)) {
      if (!rentalsTableMissingLogged) {
        console.warn(
          "[rentalService.expireRentalsPastEnd] skipped: rentals table missing (public.rentals)"
        );
        rentalsTableMissingLogged = true;
      }
      return [];
    }
    console.error("[rentalService.expireRentalsPastEnd] failed", error);
    return [];
  }

  const results = [];
  for (const r of due) {
    try {
      results.push(await finalizeRental(r.id, RentalStatus.expired));
    } catch (e) {
      console.error("[rental expiry]", r.id, e.message);
    }
  }
  return results;
}

export async function getActiveRentalForUser(userId) {
  const { data, error } = await supabase
    .from("rentals")
    .select("*, bikes(*)")
    .eq("user_id", userId)
    .in("status", [RentalStatus.active, RentalStatus.ongoing])
    .maybeSingle();
  if (error) {
    console.error("[rentalService.getActiveRentalForUser] failed", error);
    throw new AppError("Unable to fetch active rental", 500);
  }
  return data ?? null;
}

export async function listBookingsForUser(userId) {
  const { data, error } = await supabase
    .from("rentals")
    .select("*, bikes(*)")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });
  if (error) {
    console.error("[rentalService.listBookingsForUser] failed", error);
    throw new AppError("Unable to fetch bookings", 500);
  }
  return data;
}
