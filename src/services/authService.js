import supabase from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";
import { signToken } from "../middleware/auth.js";

export async function loginWithPhone({ phone, otp, name }) {
  if (otp !== env.demoOtp) {
    throw new AppError("Invalid OTP", 401);
  }

  const displayName = name?.trim() || "Rider";
  const { data: existingUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (fetchError) {
    console.error("[authService.loginWithPhone] fetch user failed", fetchError);
    throw new AppError("Unable to login right now", 500);
  }

  let user = existingUser;
  if (user) {
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ name: displayName })
      .eq("id", user.id)
      .select("*")
      .single();
    if (updateError) {
      console.error("[authService.loginWithPhone] update user failed", updateError);
      throw new AppError("Unable to login right now", 500);
    }
    user = updatedUser;
  } else {
    const { data: createdUser, error: createError } = await supabase
      .from("users")
      .insert([{ phone, name: displayName }])
      .select("*")
      .single();
    if (createError) {
      console.error("[authService.loginWithPhone] create user failed", createError);
      throw new AppError("Unable to login right now", 500);
    }
    user = createdUser;
  }

  const token = signToken(user);
  return { token, user };
}
