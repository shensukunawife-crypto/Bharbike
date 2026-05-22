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
  // 1. Strict Active Rental Check
  const { data: active, error: activeError } = await supabase
    .from("rentals")
    .select("id")
    .eq("user_id", userId)
    .eq("status", RentalStatus.active)
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

  // 3. Create Rental
  const { data: rental, error: createError } = await supabase
    .from("rentals")
    .insert([
      {
        user_id: userId,
        bike_id: bike.id,
        duration: PLAN_HOURS[plan],
        price: PLAN_PRICE[plan],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: RentalStatus.active,
      },
    ])
    .select("*")
    .single();

  if (createError) {
    console.error("[rentalService.startRental] rental create failed", JSON.stringify(createError));
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

  // 4. Update Bike Status
  try {
    const { error: bikeUpdateError } = await supabase
      .from("bikes")
      .update({ status: BikeStatus.in_use })
      .eq("id", bike.id);
    
    if (bikeUpdateError) {
      console.warn("[rentalService.startRental] bike status update failed:", bikeUpdateError.message);
    }
  } catch (err) {
    console.warn("[rentalService.startRental] bike update exception:", err.message);
  }

  // Skip IoT unlock if not configured (demo mode)
  try {
    await iot.unlockBike(bike.id);
  } catch (iotErr) {
    console.log("[rentalService] IoT unlock skipped (not configured):", iotErr.message);
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
  if (rental.status !== RentalStatus.active) {
    throw new AppError("Rental is not active", 409);
  }

  try {
    await supabase.from("rentals").update({ status }).eq("id", rentalId);
  } catch (e) {
    console.warn("[rentalService.finalizeRental] rental update RLS blocked (non-blocking):", e?.message);
  }

  try {
    await supabase.from("bikes").update({ status: BikeStatus.available }).eq("id", rental.bike_id);
  } catch (e) {
    console.warn("[rentalService.finalizeRental] bike update RLS blocked (non-blocking):", e?.message);
  }

  // Skip IoT lock if not configured (demo mode)
  try {
    await iot.lockBike(rental.bike_id);
  } catch (iotErr) {
    console.log("[rentalService] IoT lock skipped (not configured):", iotErr.message);
  }

  // Record earning — non-blocking if it fails
  const amount = rental.price || 0;
  try {
    await earningsService.recordEarning(rental.user_id, amount, EarningsType.rental);
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
  const { data: due, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("status", RentalStatus.active)
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
    .eq("status", RentalStatus.active)
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
