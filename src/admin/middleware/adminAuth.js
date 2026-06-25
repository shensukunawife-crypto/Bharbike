import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand } from "../../config/branding.js";
import supabase from "../../config/supabase.js";

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function requireAdminAuth(req, res, next) {
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
      return res.redirect(302, "/admin/login?err=no_token");
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!payload.role) {
      if (onAdminSite && req.method === "GET") {
        return res.redirect(302, "/admin/login?err=no_role");
      }
      return res.status(403).json({ success: false, message: "Forbidden: Admin privileges required" });
    }

    // Security check: Verify the admin is still active
    if (payload.admin_id && payload.role !== "master_admin" && payload.role !== "admin") {
      const { data: dbAdmin } = await supabase
        .from("admin_users")
        .select("is_active")
        .eq("id", payload.admin_id)
        .maybeSingle();

      if (!dbAdmin || !dbAdmin.is_active) {
        throw new Error("db_inactive");
      }
    }

    req.admin = payload;
    res.locals.admin = payload;
    return next();
  } catch (error) {
    console.error("[adminAuth] Error verifying token:", error.message, error);
    if (onAdminSite && req.method === "GET") {
      const errMsg = encodeURIComponent(error.message);
      return res.redirect(302, `/admin/login?err=${errMsg}`);
    }
    return res.status(401).json({ success: false, message: "Invalid or expired token", error: error.message });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin) {
      const url = String(req.originalUrl || "").split("?")[0];
      const onAdminSite = req.baseUrl === "/admin" || url.startsWith("/admin") || req.path.startsWith("/admin");
      if (onAdminSite && req.method === "GET") {
        return res.redirect(302, "/admin/login");
      }
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Strict restriction: Sub-admins, managers, and support agents cannot access financial status or payments
    if (req.admin.role === "sub_admin" || req.admin.role === "manager" || req.admin.role === "support") {
      const isEditPayment = req.originalUrl.includes("payments") && req.originalUrl.includes("/edit") && req.method === "POST";
      if (isEditPayment) {
        return next();
      }

      const isFinanceRequest = 
        permission === "manage_finance" || 
        req.originalUrl.includes("earnings") || 
        req.originalUrl.includes("analytics") || 
        req.originalUrl.includes("payments");
        
      if (isFinanceRequest) {
        if (req.method === "GET") {
          return res.status(403).render("layout", {
            BRAND_NAME,
            BRAND_PRODUCT_NAME,
            formatBrand,
            title: "Access Denied",
            active: "dashboard",
            bodyView: "forbidden",
            message: "Access Denied: Sub-admins are completely restricted from viewing financial status or configuring payments.",
            locals: { admin: req.admin }
          });
        }
        return res.status(403).json({
          success: false,
          message: "Forbidden: Sub-admins are not allowed to view financial status or manage payments."
        });
      }
    }
    
    // Master admin gets everything (both old 'admin' and new 'master_admin' tokens)
    if (req.admin.role === "master_admin" || req.admin.role === "admin" || (req.admin.permissions && req.admin.permissions.includes("*"))) {
      return next();
    }
    
    if (req.admin.permissions && req.admin.permissions.includes(permission)) {
      return next();
    }
    
    if (req.method === "GET") {
      // Render a beautiful Access Denied page inside layout shell
      return res.status(403).render("layout", {
        BRAND_NAME,
        BRAND_PRODUCT_NAME,
        formatBrand,
        title: "Access Denied",
        active: "dashboard",
        bodyView: "forbidden",
        message: `You do not have the required permission (${permission.replace(/_/g, ' ')}) to access this page.`,
        locals: { admin: req.admin }
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      message: `Forbidden: You do not have the required permission (${permission.replace(/_/g, ' ')}) to perform this action.` 
    });
  };
}

