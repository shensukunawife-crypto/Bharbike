import { Router } from "express";
import * as addressController from "../controllers/addressController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all addresses for user
router.get("/", addressController.getAddresses);

// Get default address
router.get("/default", addressController.getDefaultAddress);

// Get single address
router.get("/:id", addressController.getAddress);

// Create new address
router.post("/", addressController.createAddress);

// Update address
router.put("/:id", addressController.updateAddress);

// Delete address
router.delete("/:id", addressController.deleteAddress);

// Set address as default
router.patch("/:id/default", addressController.setDefaultAddress);

export default router;
