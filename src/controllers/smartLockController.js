import { asyncHandler } from "../utils/asyncHandler.js";
import * as iotService from "../services/iotService.js";
import * as rentalService from "../services/rentalService.js";
import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";

/**
 * Get lock status for user's active rental
 * GET /api/smartlock/status
 */
export const getLockStatus = asyncHandler(async (req, res) => {
  // Get user's active rental
  const rental = await rentalService.getActiveRentalForUser(req.user.id);
  
  if (!rental) {
    return res.json({
      success: true,
      data: {
        hasActiveRental: false,
        isLocked: true,
        message: "No active rental found",
      },
    });
  }

  // Get bike lock status from database
  const { data: bike, error } = await supabase
    .from("bikes")
    .select("id, name, license_plate, is_locked, battery_level, last_ping_at")
    .eq("id", rental.bikeId)
    .single();

  if (error) {
    throw new AppError("Unable to fetch bike status", 500);
  }

  res.json({
    success: true,
    data: {
      hasActiveRental: true,
      rentalId: rental.id,
      bikeId: bike.id,
      bikeName: bike.name,
      licensePlate: bike.license_plate,
      isLocked: bike.is_locked !== false, // Default to locked if null
      batteryLevel: bike.battery_level || 87,
      lastPingAt: bike.last_ping_at,
      rentalExpiresAt: rental.endTime,
    },
  });
});

/**
 * Lock the bike
 * POST /api/smartlock/lock
 */
export const lockBike = asyncHandler(async (req, res) => {
  // Get user's active rental
  const rental = await rentalService.getActiveRentalForUser(req.user.id);
  
  if (!rental) {
    throw new AppError("No active rental found", 404);
  }

  // Send lock command to IoT device
  const iotResult = await iotService.lockBike(rental.bikeId);
  
  if (!iotResult.ok) {
    throw new AppError("Failed to lock bike", 500);
  }

  // Update bike status in database
  const { error } = await supabase
    .from("bikes")
    .update({ 
      is_locked: true,
      last_ping_at: new Date().toISOString(),
    })
    .eq("id", rental.bikeId);

  if (error) {
    console.error("[lockBike] Database update failed:", error);
    throw new AppError("Failed to update bike status", 500);
  }

  // Log the action
  await supabase.from("bike_lock_logs").insert([
    {
      bike_id: rental.bikeId,
      user_id: req.user.id,
      rental_id: rental.id,
      action: "lock",
      method: "app",
      success: true,
    },
  ]);

  res.json({
    success: true,
    data: {
      bikeId: rental.bikeId,
      isLocked: true,
      message: "Bike locked successfully",
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
  const rental = await rentalService.getActiveRentalForUser(req.user.id);
  
  if (!rental) {
    throw new AppError("No active rental found", 404);
  }

  // Check if rental has expired
  const now = new Date();
  const expiryTime = new Date(rental.endTime);
  if (now > expiryTime) {
    throw new AppError("Rental has expired. Please extend your rental to unlock.", 400);
  }

  // Send unlock command to IoT device
  const iotResult = await iotService.unlockBike(rental.bikeId);
  
  if (!iotResult.ok) {
    throw new AppError("Failed to unlock bike", 500);
  }

  // Update bike status in database
  const { error } = await supabase
    .from("bikes")
    .update({ 
      is_locked: false,
      last_ping_at: new Date().toISOString(),
    })
    .eq("id", rental.bikeId);

  if (error) {
    console.error("[unlockBike] Database update failed:", error);
    throw new AppError("Failed to update bike status", 500);
  }

  // Log the action
  await supabase.from("bike_lock_logs").insert([
    {
      bike_id: rental.bikeId,
      user_id: req.user.id,
      rental_id: rental.id,
      action: "unlock",
      method: method,
      success: true,
    },
  ]);

  res.json({
    success: true,
    data: {
      bikeId: rental.bikeId,
      isLocked: false,
      message: "Bike unlocked successfully",
      method: method,
    },
  });
});

/**
 * Get bike health/status
 * GET /api/smartlock/health
 */
export const getBikeHealth = asyncHandler(async (req, res) => {
  // Get user's active rental
  const rental = await rentalService.getActiveRentalForUser(req.user.id);
  
  if (!rental) {
    throw new AppError("No active rental found", 404);
  }

  // Get health from IoT device
  const health = await iotService.getBikeHealth(rental.bikeId);

  // Get bike details from database
  const { data: bike } = await supabase
    .from("bikes")
    .select("name, license_plate, battery_level, is_locked")
    .eq("id", rental.bikeId)
    .single();

  res.json({
    success: true,
    data: {
      bikeId: rental.bikeId,
      bikeName: bike?.name,
      licensePlate: bike?.license_plate,
      batteryLevel: bike?.battery_level || health.batteryPct,
      isLocked: bike?.is_locked !== false,
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
    throw new AppError("Unable to fetch alerts", 500);
  }

  res.json({
    success: true,
    data: alerts || [],
  });
});
