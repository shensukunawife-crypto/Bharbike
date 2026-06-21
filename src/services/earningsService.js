import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { EarningsType } from "../constants/dbEnums.js";

export async function recordEarning(userId, amount, type) {
  const { data, error } = await supabase
    .from("earnings")
    .insert([{ user_id: userId, amount, type }])  // fixed: user_id not userId
    .select("*")
    .single();
  if (error) {
    console.error("[earningsService.recordEarning] failed", error);
    throw new AppError("Unable to record earning", 500);
  }
  return data;
}

export async function listEarnings(userId) {
  const { data, error } = await supabase
    .from("earnings")
    .select("*")
    .eq("user_id", userId)  // fixed: user_id not userId
    .order("created_at", { ascending: false });  // fixed: created_at not createdAt
  if (error) {
    console.error("[earningsService.listEarnings] failed", error);
    throw new AppError("Unable to fetch earnings", 500);
  }
  return data;
}

export async function earningsSummary(userId) {
  const { data: rows, error } = await supabase
    .from("earnings")
    .select("type, amount")
    .eq("userId", userId);
  if (error) {
    console.error("[earningsService.earningsSummary] failed", error);
    throw new AppError("Unable to fetch earnings summary", 500);
  }

  const delivery = rows
    .filter((r) => r.type === EarningsType.delivery)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const rental = rows
    .filter((r) => r.type === EarningsType.rental)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return {
    delivery: Number(delivery),
    rental: Number(rental),
    total: Number(delivery) + Number(rental),
  };
}
