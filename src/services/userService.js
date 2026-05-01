import supabase from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";

export async function getProfile(userId) {
  const { data: user, error: userError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (userError) {
    console.error("[userService.getProfile] profiles", userError);
    throw new AppError("Unable to fetch profile", 500);
  }
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { data: deliveryRequest } = await supabase
    .from("delivery_requests")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();

  return { ...user, deliveryRequest: deliveryRequest ?? null };
}
