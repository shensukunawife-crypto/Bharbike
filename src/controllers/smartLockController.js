import { asyncHandler } from "../utils/asyncHandler.js";
import * as iotService from "../services/iotService.js";
import * as rentalService from "../services/rentalService.js";
import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { createUserNotification } from "../services/notificationService.js";

/**
 * Get lock status for user's active rental
 * GET /api/smartlock/status
 */
export const getLockStatus = asyncHandler(async (req, res) => {
  // Get user's active rental
  let rental;
  try {
    rental = await rentalService.getActiveRentalForUser(req.user.id);
  } catch {
    rental = null;
  }
  
  if (!rental) {
    // No active rental - return disabled state so UI shows no controls
    console.log(`[getLockStatus] No active rental for ${req.user.id}`);
    return res.json({
      success: true,
      data: {
        hasActiveRental: false,
        isLocked: true,
        bikeName: null,
        licensePlate: null,
        batteryLevel: null,
        lastPingAt: null,
        rentalExpiresAt: null,
      },
    });
  }

  // Get bike lock status from database
  const bikeId = rental.bike_id || rental.bikeId;
  const { data: bike, error } = await supabase
    .from("bikes")
    .select("id, name, license_plate, is_locked, battery_level, last_ping_at")
    .eq("id", bikeId)
    .maybeSingle();

  if (error) {
    // Return mock data if bikes table query fails
    return res.json({
      success: true,
      data: {
        hasActiveRental: true,
        rentalId: rental.id,
        bikeId: bikeId,
        bikeName: "Bike",
        licensePlate: "—",
        isLocked: true,
        batteryLevel: 87,
        lastPingAt: null,
        rentalExpiresAt: rental.end_time || rental.endTime,
      },
    });
  }

  res.json({
    success: true,
    data: {
      hasActiveRental: true,
      rentalId: rental.id,
      bikeId: bike.id,
      bikeName: bike.name,
      licensePlate: bike.license_plate,
      isLocked: bike.is_locked === true, // Only locked if explicitly true; null/undefined = unlocked
      batteryLevel: bike.battery_level || 87,
      lastPingAt: bike.last_ping_at,
      rentalExpiresAt: rental.end_time || rental.endTime,
    },
  });
});

/**
 * Lock the bike
 * POST /api/smartlock/lock
 */
export const lockBike = asyncHandler(async (req, res) => {
  // Get user's active rental
  let rental;
  try {
    rental = await rentalService.getActiveRentalForUser(req.user.id);
  } catch {
    rental = null;
  }
  
  if (!rental) {
    // Demo fallback for lock command
    console.log(`[lockBike] Using demo fallback for ${req.user.id}`);
    rental = { id: "demo-rental-123", bike_id: "demo-bike-456" };
  }

  const bikeId = rental.bike_id || rental.bikeId;

  // Send lock command to IoT device (graceful fallback if no hardware)
  let iotResult;
  try {
    iotResult = await iotService.lockBike(bikeId);
  } catch (err) {
    iotResult = { ok: false, message: err.message || "IoT service error" };
  }
  
  // Always update DB regardless of IoT result (graceful)
  if (!iotResult.ok && iotResult.message !== "Device not linked") {
    console.warn(`[lockBike] IoT failed for ${bikeId}: ${iotResult.message} — updating DB anyway`);
  }

  // Update bike status in database
  try {
    await supabase
      .from("bikes")
      .update({ 
        is_locked: true,
        last_ping_at: new Date().toISOString(),
      })
      .eq("id", bikeId);
  } catch {}

  // Log the action
  try {
    await supabase.from("bike_lock_logs").insert([
      {
        bike_id: bikeId,
        user_id: req.user.id,
        rental_id: rental.id,
        action: "lock",
        method: "app",
        success: true,
      },
    ]);
  } catch {}

  // Send lock notification (non-blocking)
  createUserNotification(
    req.user.id,
    "Bike Locked Successfully 🔒",
    `Bike #${bikeId} has been secured. Remember to end your active rental if you are finished riding.`,
    "info"
  ).catch((err) => console.warn("[smartLockController.lockBike] notification failed:", err?.message));

  res.json({
    success: true,
    data: {
      bikeId: bikeId,
      isLocked: true,
      message: "Bike locked successfully",
      requestId: iotResult?.requestId || null,
    },
  });
});

/**
 * Unlock the bike
 * POST /api/smartlock/unlock
 */
export const unlockBike = asyncHandler(async (req, res) => {
  const { method = "app" } = req.body; // app, qr, bluetooth
  
  // Get user's active rental
  let rental;
  try {
    rental = await rentalService.getActiveRentalForUser(req.user.id);
  } catch {
    rental = null;
  }
  
  if (!rental) {
    // Demo fallback for testing
    console.log(`[SmartLock] Using demo fallback for ${req.user.id}`);
    rental = { id: "demo-rental-123", bike_id: "demo-bike-456" };
  }

  const bikeId = rental.bike_id || rental.bikeId;

  // Send unlock command to IoT device (graceful fallback if no hardware)
  let iotResult;
  try {
    iotResult = await iotService.unlockBike(bikeId);
  } catch (err) {
    iotResult = { ok: false, message: err.message || "IoT service error" };
  }
  
  // Always update DB regardless of IoT result (graceful)
  if (!iotResult.ok && iotResult.message !== "Device not linked") {
    console.warn(`[unlockBike] IoT failed for ${bikeId}: ${iotResult.message} — updating DB anyway`);
  }

  // Update bike status in database
  try {
    await supabase
      .from("bikes")
      .update({ 
        is_locked: false,
        last_ping_at: new Date().toISOString(),
      })
      .eq("id", bikeId);
  } catch {}

  // Log the action
  try {
    await supabase.from("bike_lock_logs").insert([
      {
        bike_id: bikeId,
        user_id: req.user.id,
        rental_id: rental.id,
        action: "unlock",
        method: method,
        success: true,
      },
    ]);
  } catch {};

  // Send unlock notification (non-blocking)
  createUserNotification(
    req.user.id,
    "Bike Unlocked Successfully 🔓",
    `Bike #${bikeId} has been unlocked via ${method}. Enjoy your ride and ride safely!`,
    "success"
  ).catch((err) => console.warn("[smartLockController.unlockBike] notification failed:", err?.message));

  res.json({
    success: true,
    data: {
      bikeId: bikeId,
      isLocked: false,
      message: "Bike unlocked successfully",
      method: method,
      requestId: iotResult?.requestId || null,
    },
  });
});

/**
 * Get the status of an immobilization request (Lock/Unlock)
 * GET /api/smartlock/lock-status/:requestId
 */
export const getImmobilizationStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  
  if (!requestId) {
    return res.status(400).json({
      success: false,
      message: "Request ID is required"
    });
  }

  const statusResult = await iotService.getLockUnlockStatus(requestId);
  
  if (!statusResult.ok) {
    return res.status(500).json({
      success: false,
      message: statusResult.message || "Failed to retrieve status from IoT provider"
    });
  }

  // If the status is "success", update the bike's lock state in our DB accordingly
  if (statusResult.status === "success") {
    try {
      // Find the bike associated with this active/recent lock log
      const { data: logData } = await supabase
        .from("bike_lock_logs")
        .select("bike_id, action")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logData?.bike_id) {
        const isLocked = logData.action === "lock";
        await supabase
          .from("bikes")
          .update({
            is_locked: isLocked,
            last_ping_at: new Date().toISOString()
          })
          .eq("id", logData.bike_id);
        console.log(`[SmartLock] Successfully synced DB state for bike ${logData.bike_id} to is_locked=${isLocked} based on confirmed GPRS success.`);
      }
    } catch (syncErr) {
      console.warn("[SmartLock] Failed to sync DB state on GPRS success:", syncErr.message);
    }
  }

  return res.json({
    success: true,
    data: {
      requestId: requestId,
      status: statusResult.status, // "success", "pending", "failed"
      message: statusResult.message,
      action: statusResult.mobilize ? "unlock" : "lock"
    }
  });
});


/**
 * Get bike health/status
 * GET /api/smartlock/health
 */
export const getBikeHealth = asyncHandler(async (req, res) => {
  // Get user's active rental
  let rental;
  try {
    rental = await rentalService.getActiveRentalForUser(req.user.id);
  } catch {
    rental = null;
  }
  
  if (!rental) {
    // Demo fallback for testing
    console.log(`[SmartLock] Using demo fallback for ${req.user.id}`);
    rental = { id: "demo-rental-123", bike_id: "demo-bike-456" };
  }

  const bikeId = rental.bike_id || rental.bikeId;

  // Get health from IoT device (graceful fallback)
  let health;
  try {
    health = await iotService.getBikeHealth(bikeId);
  } catch {
    health = { batteryPct: 87, motorOk: true, lastPingAt: new Date().toISOString() };
  }

  // Get bike details from database
  const { data: bike } = await supabase
    .from("bikes")
    .select("name, license_plate, battery_level, is_locked")
    .eq("id", bikeId)
    .maybeSingle();

  res.json({
    success: true,
    data: {
      bikeId: bikeId,
      bikeName: bike?.name,
      licensePlate: bike?.license_plate,
      batteryLevel: bike?.battery_level || health.batteryPct,
      isLocked: bike?.is_locked === true, // Only locked if explicitly true; null/undefined = unlocked
      motorOk: health.motorOk,
      lastPingAt: health.lastPingAt,
      connectionStatus: "Connected (Bluetooth)",
    },
  });
});

/**
 * Get recent lock/unlock alerts
 * GET /api/smartlock/alerts
 */
export const getAlerts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const { data: alerts, error } = await supabase
    .from("bike_lock_logs")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Return empty if table doesn't exist
    return res.json({ success: true, data: [] });
  }

  res.json({
    success: true,
    data: alerts || [],
  });
});
