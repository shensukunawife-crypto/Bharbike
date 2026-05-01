import { env } from "../config/env.js";

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (env.nodeEnv === "development") {
    console.error(err);
  } else if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(err.details && { details: err.details }),
    ...(env.nodeEnv === "development" && status === 500 && { stack: err.stack }),
  });
}
