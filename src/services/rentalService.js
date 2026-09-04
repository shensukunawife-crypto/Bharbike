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
import { hasActiveSubscription, hasPassedGracePeriod, getGracePeriodExpiry } from "./subscriptionService.js";

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
    .update({ status: BikeStatus.in_use, is_locked: false })
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

  // ── Immediate Lock Dispatch + Retry Pool Protocol ─────────────────────────
  // We ALWAYS dispatch the IMMOBILIZE command directly to LocoNav immediately
  // upon rental expiry (e.g. 09:30 AM IST). This ensures:
  // 1. LocoNav registers the immobilize request immediately with an official request ID.
  // 2. The client and logs see the command dispatched for EVERY expired bike on time.
  // 3. If the device was asleep/offline at the time, LocoNav queues the request, AND
  //    our Lock Pool keeps monitoring every 3 min to fire an active retry on wakeup.
  let iotResult = { ok: false, message: 'not attempted' };
  let deviceOnlineStatus = { online: false, reason: 'check_not_run' };

  try {
    deviceOnlineStatus = await iot.checkDeviceOnline(rental.bike_id);
    console.log(`[rentalService] Telemetry check before expiry lock, bike ${rental.bike_id}:`, deviceOnlineStatus);
  } catch (statusErr) {
    console.warn(`[rentalService] Device online check threw for bike ${rental.bike_id}:`, statusErr.message);
    deviceOnlineStatus = { online: false, reason: 'check_api_error', error: statusErr.message };
  }

  // 🚨 CRITICAL VEHICLE SAFETY GUARD: NEVER IMMOBILIZE A VEHICLE IN MOTION OR WITH IGNITION ON!
  const isMoving = Number(deviceOnlineStatus.speed || 0) > 3;
  const isIgnitionOn = String(deviceOnlineStatus.ignition || '').toUpperCase() === 'ON';

  if (isMoving) {
    console.warn(`[rentalService] ⚠️ SAFETY HOLD: Bike ${rental.bike_id} is MOVING at ${deviceOnlineStatus.speed} km/h! Immobilize blocked until vehicle is stopped.`);
    iotResult = {
      ok: false,
      message: `Safety hold: vehicle is moving (${deviceOnlineStatus.speed} km/h) — immobilize deferred to Lock Pool when stopped`
    };
  } else if (isIgnitionOn) {
    console.warn(`[rentalService] ⚠️ SAFETY HOLD: Bike ${rental.bike_id} has IGNITION ON! Immobilize blocked until engine/ignition is turned off.`);
    iotResult = {
      ok: false,
      message: 'Safety hold: vehicle ignition is ON — immobilize deferred to Lock Pool when parked'
    };
  } else {
    if (!deviceOnlineStatus.online) {
      console.log(`[rentalService] Bike ${rental.bike_id} is currently sleeping/offline (${deviceOnlineStatus.reason}) — dispatching IMMOBILIZE to LocoNav so it registers on portal & network.`);
    }

    try {
      iotResult = await iot.lockBike(rental.bike_id);
      console.log(`[rentalService] IoT lock response for bike ${rental.bike_id}:`, iotResult);
    } catch (iotErr) {
      console.warn(`[rentalService] IoT lock failed for bike ${rental.bike_id}:`, iotErr.message);
      iotResult = { ok: false, message: iotErr.message || 'IoT service error' };
    }
  }

  // Log the lock action to bike_lock_logs
  // success: true  → device was online and LocoNav accepted the command
  // success: false → device was offline (pool will retry) OR lock API returned an error
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
        iot_request_id: iotResult?.requestId || null,
        device_online_check: deviceOnlineStatus
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
  // Also check rentals with end_time is null so admin-assigned bikes without explicit end_time are evaluated against user's subscription
  const { data: due, error } = await supabase
    .from("rentals")
    .select("*")
    .in("status", [RentalStatus.active, RentalStatus.ongoing])
    .or(`end_time.lt.${now.toISOString()},end_time.is.null`);
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
      // 1. Check if user has an active or recent subscription
      const { data: latestSub } = await supabase
        .from("user_subscriptions")
        .select("end_date, status")
        .eq("user_id", r.user_id)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSub && latestSub.end_date) {
        // If user has an active subscription in progress, extend the rental end_time
        if (latestSub.status === "active" && new Date(latestSub.end_date) > now) {
          await supabase.from("rentals").update({
            end_time: latestSub.end_date,
            updated_at: new Date().toISOString()
          }).eq("id", r.id);
          console.log(`[rentalService] Extended rental ${r.id} to subscription end ${latestSub.end_date} (user has active plan)`);
          continue;
        }

        // Check if user is still within the 9:30 AM IST next-day grace period!
        // Grace period allows riders to finish their night and renew until 9:30 AM next morning.
        if (!hasPassedGracePeriod(latestSub.end_date)) {
          // Still in grace period — do NOT expire rental or lock the bike yet!
          // Auto-sync rental end_time to 09:30 AM IST grace period cutoff so it stays valid throughout the night
          const graceExp = getGracePeriodExpiry(latestSub.end_date);
          if (r.end_time !== graceExp.toISOString()) {
            await supabase.from("rentals").update({
              end_time: graceExp.toISOString(),
              updated_at: new Date().toISOString()
            }).eq("id", r.id);
            console.log(`[rentalService] Auto-synced rental ${r.id} to 09:30 AM grace period cutoff (${graceExp.toISOString()})`);
          }
          continue;
        }
      }

      // Past 9:30 AM grace period (or no subscription) — expire the rental and lock the bike
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

    const bikeId = expiredRental.bikes.id;

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

    // Physically unlock the bike via IoT — user paid, they get access back.
    // Note: We always send the unlock command regardless of device online status.
    // Unlike lock (where we skip offline), unlock is sent so LocoNav queues it for
    // immediate delivery the moment the device reconnects.
    let iotResult = { ok: false, message: 'not attempted' };
    let deviceOnlineStatus = { online: false, reason: 'check_not_run' };

    try {
      deviceOnlineStatus = await iot.checkDeviceOnline(bikeId);
      console.log(`[rentalService] Device online check before renewal unlock, bike ${bikeId}:`, deviceOnlineStatus);
    } catch (statusErr) {
      console.warn(`[rentalService] Device online check threw for bike ${bikeId} (unlock):`, statusErr.message);
      deviceOnlineStatus = { online: false, reason: 'check_api_error' };
    }

    if (!deviceOnlineStatus.online) {
      console.log(`[rentalService] Bike ${bikeId} is OFFLINE during plan renewal — unlock command will be queued by LocoNav for delivery on reconnect.`);
    }

    try {
      iotResult = await iot.unlockBike(bikeId);
      console.log(`[rentalService] IoT unlock on plan renewal for bike ${bikeId}:`, iotResult);
    } catch (iotErr) {
      console.warn(`[rentalService] IoT unlock failed on plan renewal for bike ${bikeId}:`, iotErr.message);
      iotResult = { ok: false, message: iotErr.message };
    }

    // Update bike is_locked status in DB
    try {
      await supabase
        .from("bikes")
        .update({ is_locked: false, status: BikeStatus.in_use })
        .eq("id", bikeId);
    } catch (bErr) {
      console.warn("[rentalService] Failed to update bike is_locked to false on renewal:", bErr.message);
    }

    // Log the unlock to bike_lock_logs
    try {
      await supabase.from("bike_lock_logs").insert([{
        bike_id: bikeId,
        user_id: userId,
        action: "unlock",
        method: "app",
        success: iotResult?.ok !== false,
        error_message: iotResult?.ok === false ? (iotResult?.message || null) : null,
        metadata: {
          triggered_by: "plan_renewal",
          rental_id: expiredRental.id,
          new_sub_end: newSubEndDate,
          iot_request_id: iotResult?.requestId || null,
          device_online_check: deviceOnlineStatus
        }
      }]);
    } catch (logErr) {
      console.warn("[rentalService] Failed to insert unlock log on renewal:", logErr.message);
    }

    console.log(`[rentalService] Reactivated rental ${expiredRental.id} for user ${userId} — plan renewed, bike ${bikeId} unlocked until ${newSubEndDate}`);
    return expiredRental.id;
  } catch (err) {
    console.error(`[rentalService.reactivateRentalOnPlanRenewal] unexpected error for user ${userId}:`, err.message);
    return null;
  }
}

export async function getActiveRentalForUser(userId) {
  // Returns active/ongoing rentals AND expired rentals (where user still holds the bike)
  // This ensures users always see their assigned bike even if the subscription ran out
  const { data: rows, error } = await supabase
    .from("rentals")
    .select("*, bikes(*)")
    .eq("user_id", userId)
    .in("status", [RentalStatus.active, RentalStatus.ongoing, RentalStatus.expired])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[rentalService.getActiveRentalForUser] failed", error);
    throw new AppError("Unable to fetch active rental", 500);
  }
  const data = rows?.[0] || null;
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

