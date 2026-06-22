import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand } from "../config/branding.js";

import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";

export function adminLoginPage(req, res) {
  return res.render("admin-login", { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand });
}

export function adminApiLogin(req, res) {
  return handleAdminApiLogin(req, res);
}

async function handleAdminApiLogin(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required" });
  }

  // 1. Check Sub-Admins in the database
  try {
    const { data: dbAdmin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", username.trim().toLowerCase())
      .maybeSingle();

    if (!error && dbAdmin && dbAdmin.is_active) {
      const isMatch = await bcrypt.compare(password, dbAdmin.password_hash);
      if (isMatch) {
        await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", dbAdmin.id);
        
        const token = jwt.sign(
          { 
            role: dbAdmin.role || "sub_admin", 
            admin_id: dbAdmin.id,
            permissions: dbAdmin.permissions || [] 
          }, 
          env.jwtSecret, 
          { expiresIn: "1d" }
        );
        return res.json({ token, role: dbAdmin.role });
      }
    }
  } catch (err) {
    // Table might not exist yet, fallback silently
  }

  // 2. Fallback to Master Admin in .env
  if (username === env.adminUsername && password === env.adminPassword) {
    const token = jwt.sign(
      { 
        role: "master_admin",
        permissions: ["*"] // Master has all permissions
      }, 
      env.jwtSecret, 
      { expiresIn: "1d" }
    );
    return res.json({ token, role: "master_admin" });
  }

  return res.status(401).json({ success: false, message: "Invalid admin credentials" });
}
