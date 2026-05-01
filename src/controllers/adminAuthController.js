import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand } from "../../../config/branding.js";

export function adminLoginPage(req, res) {
  return res.render("admin-login", { BRAND_NAME, BRAND_PRODUCT_NAME, formatBrand });
}

export function adminApiLogin(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required" });
  }

  if (username !== env.adminUsername || password !== env.adminPassword) {
    return res.status(401).json({ success: false, message: "Invalid admin credentials" });
  }

  const token = jwt.sign({ role: "admin" }, env.jwtSecret, { expiresIn: "1d" });
  return res.json({ token });
}
