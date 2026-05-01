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

const PLAN_MS = {
  [RentalPlan.daily]: 24 * 60 * 60 * 1000,
  [RentalPlan.weekly]: 7 * 24 * 60 * 60 * 1000,
  [RentalPlan.monthly]: 30 * 24 * 60 * 60 * 1000,
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
  const { data: active, error: activeError } = await supabase
    .from("rentals")
    .select("*")
    .eq("userId", userId)
    .eq("status", RentalStatus.active)
    .maybeSingle();
  if (activeError) {
    console.error("[rentalService.startRental] active check failed", activeError);
    throw new AppError("Unable to start rental", 500);
  }
  if (active) {
    throw new AppError("You already have an active rental", 409);
  }

  const bike = await pickFirstAvailableBike();
  if (!bike) {
    throw new AppError("No bikes available", 409);
  }

  const startTime = new Date();
  const endTime = addPlanDuration(startTime, plan);

  const { data: rental, error: createError } = await supabase
    .from("rentals")
    .insert([
      {
        userId,
        bikeId: bike.id,
        plan,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: RentalStatus.active,
      },
    ])
    .select("*")
    .single();
  if (createError) {
    console.error("[rentalService.startRental] rental create failed", createError);
    throw new AppError("Unable to start rental", 500);
  }

  const { error: bikeUpdateError } = await supabase
    .from("bikes")
    .update({ status: BikeStatus.in_use })
    .eq("id", bike.id);
  if (bikeUpdateError) {
    console.error("[rentalService.startRental] bike update failed", bikeUpdateError);
    throw new AppError("Unable to start rental", 500);
  }

  await iot.unlockBike(bike.id);
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

  const { error: rentalUpdateError } = await supabase
    .from("rentals")
    .update({ status })
    .eq("id", rentalId);
  if (rentalUpdateError) {
    console.error("[rentalService.finalizeRental] rental update failed", rentalUpdateError);
    throw new AppError("Unable to end rental", 500);
  }

  const { error: bikeUpdateError } = await supabase
    .from("bikes")
    .update({ status: BikeStatus.available })
    .eq("id", rental.bikeId);
  if (bikeUpdateError) {
    console.error("[rentalService.finalizeRental] bike update failed", bikeUpdateError);
    throw new AppError("Unable to end rental", 500);
  }

  await iot.lockBike(rental.bikeId);

  const amount = PLAN_PRICE[rental.plan];
  await earningsService.recordEarning(rental.userId, amount, EarningsType.rental);

  return { rentalId, status, rentalEarning: amount };
}

export async function endRental(userId, rentalId) {
  const { data: rental, error } = await supabase
    .from("rentals")
    .select("*")
    .eq("id", rentalId)
    .eq("userId", userId)
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
    .lt("endTime", now.toISOString());
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
    .eq("userId", userId)
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
    .eq("userId", userId)
    .order("startTime", { ascending: false });
  if (error) {
    console.error("[rentalService.listBookingsForUser] failed", error);
    throw new AppError("Unable to fetch bookings", 500);
  }
  return data;
}
