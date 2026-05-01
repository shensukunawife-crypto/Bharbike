import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, phone: payload.phone };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

export function signToken(user) {
  return jwt.sign(
    { phone: user.phone },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn }
  );
}
