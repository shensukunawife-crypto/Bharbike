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

  // When a rental EXPIRES: keep the bike marked as in_use and store the user_id on the bike
  // so the user still sees their assigned bike in the app.
  // The bike is ONLY freed back to 'available' when:
  //   1. The user manually ends the ride (status = 'ended')
  //   2. An admin forcibly returns the bike from the admin panel
  const bikeUpdatePayload = { is_locked: true };
  if (status === 'expired') {
    // Keep bike in_use — just lock it. User still sees it as overdue.
    // The rental record (with status=expired) is the link between user and bike.
    // Admin must manually return the bike to free it.
    bikeUpdatePayload.status = BikeStatus.in_use;
  } else {
    // Normal end — release bike back to fleet
    bikeUpdatePayload.status = BikeStatus.available;
  }

  const { error: bikeUpdateErr } = await supabase.from("bikes").update(bikeUpdatePayload).eq("id", rental.bike_id);
  if (bikeUpdateErr) throw new AppError(`Failed to release bike: ${bikeUpdateErr.message}`, 500);

  // Send IoT lock command
  let iotResult;
  try {
    iotResult = await iot.lockBike(rental.bike_id);
    console.log(`[rentalService] IoT lock response for bike ${rental.bike_id}:`, iotResult);
  } catch (iotErr) {
    console.warn(`[rentalService] IoT lock failed or skipped for bike ${rental.bike_id}:`, iotErr.message);
    iotResult = { ok: false, message: iotErr.message || 'IoT service error' };
  }

  // Log the lock action to bike_lock_logs
  try {
    await supabase.from("bike_lock_logs").insert([{
      bike_id: rental.bike_id,
      user_id: rental.user_id,
      // rental_id: rentalId, // Omitted due to UUID vs BIGINT type mismatch
      action: "lock",
      method: "app",
      success: iotResult?.ok !== false,
      error_message: iotResult?.ok === false ? (iotResult?.message || null) : null,
      metadata: {
        triggered_by: "rental_finalization",
        status_reason: status,
        iot_request_id: iotResult?.requestId || null
      }
    }]);
  } catch (logErr) {
    console.warn("[rentalService] Failed to insert lock log:", logErr.message);
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
      // Check if user has an active subscription — if yes, extend rental to match
      // instead of expiring it. The subscription end_date is the real deadline.
      const { data: activeSub } = await supabase
        .from("user_subscriptions")
        .select("end_date")
        .eq("user_id", r.user_id)
        .eq("status", "active")
        .gt("end_date", now.toISOString())
        .maybeSingle();

      if (activeSub && activeSub.end_date) {
        // Extend rental end_time to subscription end_date
        await supabase.from("rentals").update({
          end_time: activeSub.end_date,
          updated_at: new Date().toISOString()
        }).eq("id", r.id);
        console.log(`[rentalService] Extended rental ${r.id} to subscription end ${activeSub.end_date} (user has active plan)`);
        continue; // Skip expiry for this rental
      }

      // No active subscription — expire the rental normally
      results.push(await finalizeRental(r.id, RentalStatus.expired));
    } catch (e) {
      console.error("[rental expiry]", r.id, e.message);
    }
  }
  return results;
}

/**
 * Reactivate an expired rental when a user's plan is renewed and they still
 * physically hold the bike (bike status = in_use).
 * Call this whenever a new subscription is created for a user.
 */
export async function reactivateRentalOnPlanRenewal(userId, newSubEndDate) {
  try {
    // Find their most recent expired rental where bike is still in_use
    const { data: expiredRental } = await supabase
      .from("rentals")
      .select("*, bikes(id, status)")
      .eq("user_id", userId)
      .eq("status", RentalStatus.expired)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (!expiredRental) return null; // No expired rental to reactivate
    if (!expiredRental.bikes || expiredRental.bikes.status !== BikeStatus.in_use) return null; // Bike was returned already

    // Reactivate the rental with the new subscription end date
    const { error } = await supabase.from("rentals").update({
      status: RentalStatus.ongoing,
      end_time: newSubEndDate,
      updated_at: new Date().toISOString()
    }).eq("id", expiredRental.id);

    if (error) {
      console.error(`[rentalService.reactivateRentalOnPlanRenewal] failed for user ${userId}:`, error.message);
      return null;
    }

    console.log(`[rentalService] Reactivated rental ${expiredRental.id} for user ${userId} — plan renewed, bike ${expiredRental.bikes.id} stays in_use until ${newSubEndDate}`);
    return expiredRental.id;
  } catch (err) {
    console.error(`[rentalService.reactivateRentalOnPlanRenewal] unexpected error for user ${userId}:`, err.message);
    return null;
  }
}

export async function getActiveRentalForUser(userId) {
  // Returns active/ongoing rentals AND expired rentals (where user still holds the bike)
  // This ensures users always see their assigned bike even if the subscription ran out
  const { data, error } = await supabase
    .from("rentals")
    .select("*, bikes(*)")
    .eq("user_id", userId)
    .in("status", [RentalStatus.active, RentalStatus.ongoing, RentalStatus.expired])
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (error) {
    console.error("[rentalService.getActiveRentalForUser] failed", error);
    throw new AppError("Unable to fetch active rental", 500);
  }
  // Only return the expired rental if the bike is still physically assigned (in_use)
  if (data && data.status === RentalStatus.expired) {
    if (!data.bikes || data.bikes.status !== BikeStatus.in_use) {
      return null; // Admin already returned the bike, don't show overdue card
    }
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

export async function forceExpireActiveRentalForUser(userId) {
  try {
    const activeRental = await getActiveRentalForUser(userId);
    if (activeRental) {
      await finalizeRental(activeRental.id, RentalStatus.expired);
      console.log(`[rentalService] Force expired rental ${activeRental.id} for user ${userId} due to subscription expiry.`);
    }
  } catch (err) {
    console.error(`[rentalService.forceExpireActiveRentalForUser] failed for user ${userId}:`, err.message);
  }
}

