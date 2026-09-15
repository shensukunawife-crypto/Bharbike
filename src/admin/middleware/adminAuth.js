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
    
    // Role-based restrictions for Sub-Admins and Support agents:
    // 1. Can SEE payment details (GET /admin/payments, GET /admin/api/riders/search)
    // 2. Can log manual payment entries (POST /admin/payments/add) - backend will force to "pending"
    // 3. CANNOT APPROVE, EDIT, OR DELETE payments
    // 4. CANNOT view earnings or revenue analytics
    // Note: Managers ARE authorized to edit and approve payments if they have manage_payments permission.
    if (req.admin.role === "sub_admin" || req.admin.role === "support") {
      const isPaymentApproveOrDelete = 
        req.originalUrl.includes("payments") && 
        (req.originalUrl.includes("/edit") || req.originalUrl.includes("/delete")) && 
        req.method === "POST";

      if (isPaymentApproveOrDelete) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Sub-admins are not authorized to approve, edit, or delete payments."
        });
      }

      const isViewingPayments = (req.method === "GET" && (permission === "manage_payments" || req.originalUrl.includes("payments")));
      if (isViewingPayments) {
        return next();
      }

      const isLoggingManualPayment = (req.method === "POST" && req.originalUrl.includes("payments/add"));
      if (isLoggingManualPayment) {
        return next();
      }

      const isStrictFinance = 
        permission === "manage_finance" || 
        req.originalUrl.includes("earnings") || 
        req.originalUrl.includes("analytics");

      if (isStrictFinance) {
        if (req.method === "GET") {
          return res.status(403).render("layout", {
            BRAND_NAME,
            BRAND_PRODUCT_NAME,
            formatBrand,
            title: "Access Denied",
            active: "dashboard",
            bodyView: "forbidden",
            message: "Access Denied: Sub-admins are restricted from viewing financial status or revenue analytics.",
            locals: { admin: req.admin }
          });
        }
        return res.status(403).json({
          success: false,
          message: "Forbidden: Sub-admins are not allowed to view financial status or revenue analytics."
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

