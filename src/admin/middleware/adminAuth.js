import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const cookieToken = readCookie(req.headers.cookie || "", "admin_token");
  const token = bearerToken || cookieToken;

  const url = String(req.originalUrl || "").split("?")[0];
  const onAdminSite =
    req.baseUrl === "/admin" ||
    url.startsWith("/admin") ||
    req.path.startsWith("/admin");

  if (!token) {
    if (onAdminSite && req.method === "GET") {
      return res.redirect(302, "/admin/login");
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.admin = payload;
    res.locals.admin = payload;
    return next();
  } catch {
    if (onAdminSite && req.method === "GET") {
      return res.redirect(302, "/admin/login");
    }
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Master admin gets everything (both old 'admin' and new 'master_admin' tokens)
    if (req.admin.role === "master_admin" || req.admin.role === "admin" || (req.admin.permissions && req.admin.permissions.includes("*"))) {
      return next();
    }
    
    if (req.admin.permissions && req.admin.permissions.includes(permission)) {
      return next();
    }
    
    return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to perform this action" });
  };
}
