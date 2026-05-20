import { asyncHandler } from "../utils/asyncHandler.js";
import * as supportService from "../services/supportService.js";

/**
 * Create a support ticket
 * POST /api/support/create
 */
export const createTicket = asyncHandler(async (req, res) => {
  const { user_id, bike_id, bike_name, issue_type, description, image_url } = req.body;

  const ticket = await supportService.createTicket(
    user_id || req.user.id,
    bike_id || null,
    bike_name,
    issue_type,
    description,
    image_url
  );

  res.status(201).json({
    success: true,
    data: ticket,
    ticket_number: ticket.ticket_number,
    message: "Support ticket created successfully",
  });
});

/**
 * Get all tickets for a user
 * GET /api/support/user/:userId
 */
export const getUserTickets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Ensure user can only access their own tickets (unless admin)
  if (req.user.id !== userId && !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const tickets = await supportService.getUserTickets(userId);

  res.json({
    success: true,
    data: tickets,
  });
});

/**
 * Get a single ticket by ID
 * GET /api/support/ticket/:ticketId
 */
export const getTicketById = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  const ticket = await supportService.getTicketById(ticketId);

  // Ensure user can only access their own tickets (unless admin)
  if (req.user.id !== ticket.user_id && !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  res.json({
    success: true,
    data: ticket,
  });
});

/**
 * Update ticket status (admin only)
 * PATCH /api/support/ticket/:ticketId/status
 */
export const updateTicketStatus = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { status, admin_notes } = req.body;

  const ticket = await supportService.updateTicketStatus(ticketId, status, admin_notes);

  res.json({
    success: true,
    data: ticket,
    message: "Ticket status updated successfully",
  });
});

/**
 * Upload support image
 * POST /api/support/upload
 */
export const uploadImage = asyncHandler(async (req, res) => {
  const { image_base64, file_name, content_type } = req.body;

  if (!image_base64) {
    return res.status(400).json({
      success: false,
      message: "Image data is required",
    });
  }

  const imageUrl = await supportService.uploadSupportImage(
    image_base64,
    file_name || `support-${Date.now()}.jpg`,
    content_type || "image/jpeg"
  );

  res.json({
    success: true,
    image_url: imageUrl,
    message: "Image uploaded successfully",
  });
});

/**
 * Get message history for a ticket
 * GET /api/support/ticket/:ticketId/messages
 */
export const getChatMessages = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;

  // Verify ticket exists and belongs to user (or user is admin)
  const ticket = await supportService.getTicketById(ticketId);
  if (req.user.id !== ticket.user_id && !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const messages = await supportService.getTicketMessages(ticketId);

  res.json({
    success: true,
    data: messages,
  });
});

/**
 * Send a support message
 * POST /api/support/ticket/:ticketId/messages
 */
export const sendChatMessage = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { message, image_url } = req.body;

  if (!message && !image_url) {
    return res.status(400).json({
      success: false,
      message: "Message text or image URL is required",
    });
  }

  // Verify ticket exists and belongs to user (or user is admin)
  const ticket = await supportService.getTicketById(ticketId);
  if (req.user.id !== ticket.user_id && !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  const senderType = req.user.is_admin ? "admin" : "user";

  const msg = await supportService.sendTicketMessage(
    ticketId,
    req.user.id,
    senderType,
    message,
    image_url
  );

  res.status(201).json({
    success: true,
    data: msg,
  });
});

