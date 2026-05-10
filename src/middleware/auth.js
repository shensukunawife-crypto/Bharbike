import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { supabase } from "../utils/supabaseClient.js";

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = header.slice(7);

  // Try JWT token first (for OTP login)
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, phone: payload.phone };
    return next();
  } catch (jwtError) {
    // JWT failed, try Supabase token (for email login)
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data?.user) {
        return next(new AppError("Invalid or expired token", 401));
      }

      // Map Supabase user to req.user format
      req.user = {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone || null,
      };
      return next();
    } catch (supabaseError) {
      return next(new AppError("Invalid or expired token", 401));
    }
  }
}

export function signToken(user) {
  return jwt.sign(
    { phone: user.phone },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn }
  );
}
