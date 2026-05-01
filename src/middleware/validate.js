import { validationResult } from "express-validator";
import { AppError } from "../utils/AppError.js";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new AppError("Validation failed", 422, errors.array({ onlyFirstError: true }))
    );
  }
  next();
}
