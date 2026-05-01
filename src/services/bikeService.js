import supabase from "../config/supabase.js";
import { BikeStatus } from "../constants/dbEnums.js";
import { AppError } from "../utils/AppError.js";
import { getBikeHealth } from "./iotService.js";

export async function getFleetStatus() {
  const { data: bikes, error } = await supabase.from("bikes").select("status");
  if (error) {
    console.error("[bikeService.getFleetStatus] failed", error);
    throw new AppError("Unable to fetch fleet status", 500);
  }

  const availableCount = bikes.filter((b) => b.status === BikeStatus.available).length;
  const inUseCount = bikes.filter((b) => b.status === BikeStatus.in_use).length;
  const maintenanceCount = bikes.filter((b) => b.status === BikeStatus.maintenance).length;

  return {
    availableCount,
    inUseCount,
    maintenanceCount,
    total: availableCount + inUseCount + maintenanceCount,
  };
}

export async function getBikeHealthReport(bikeId) {
  return getBikeHealth(bikeId);
}

/**
 * First available bike by bike_code (auto-assign rule).
 */
export async function pickFirstAvailableBike() {
  const { data, error } = await supabase
    .from("bikes")
    .select("*")
    .eq("status", BikeStatus.available)
    .order("bike_code", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[bikeService.pickFirstAvailableBike] failed", error);
    throw new AppError("Unable to fetch available bike", 500);
  }
  return data ?? null;
}
