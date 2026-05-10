import { Router } from "express";
import { body, param } from "express-validator";
import * as supportController from "../controllers/supportController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

// All support routes require authentication
r.use(authMiddleware);

// Create a support ticket
r.post(
  "/create",
  [
    body("bike_name").notEmpty().withMessage("Bike name is required"),
    body("issue_type").notEmpty().withMessage("Issue type is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("image_url").optional().isString(),
    body("bike_id").optional().isUUID(),
    body("user_id").optional().isUUID(),
  ],
  validateRequest,
  supportController.createTicket
);

// Upload support image
r.post(
  "/upload",
  [
    body("image_base64").notEmpty().withMessage("Image data is required"),
    body("file_name").optional().isString(),
    body("content_type").optional().isString(),
  ],
  validateRequest,
  supportController.uploadImage
);

// Get all tickets for a user
r.get(
  "/user/:userId",
  [param("userId").isUUID().withMessage("Invalid user ID")],
  validateRequest,
  supportController.getUserTickets
);

// Get a single ticket by ID
r.get(
  "/ticket/:ticketId",
  [param("ticketId").isUUID().withMessage("Invalid ticket ID")],
  validateRequest,
  supportController.getTicketById
);

// Update ticket status (admin only)
r.patch(
  "/ticket/:ticketId/status",
  [
    param("ticketId").isUUID().withMessage("Invalid ticket ID"),
    body("status")
      .isIn(["pending", "in_progress", "resolved", "cancelled"])
      .withMessage("Invalid status"),
    body("admin_notes").optional().isString(),
  ],
  validateRequest,
  supportController.updateTicketStatus
);

export default r;
