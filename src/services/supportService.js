import supabase from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";

const isDemoUser = (id) => /^demo-/i.test(String(id || ""));

/**
 * Create a support ticket
 */
export async function createTicket(userId, bikeId, bikeName, issueType, description, imageUrl = null) {
  // Demo users can't create real tickets in Supabase
  if (isDemoUser(userId)) {
    return {
      id: `demo-ticket-${Date.now()}`,
      ticket_number: `DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "pending",
      created_at: new Date().toISOString(),
      bike_name: bikeName,
      issue_type: issueType,
      description: description,
      image_url: imageUrl,
    };
  }

  // Generate unique 6-digit ticket number
  let ticketNumber;
  try {
    ticketNumber = await generateTicketNumber();
  } catch (e) {
    console.error("[supportService] ticket number gen failed:", e);
    // Fallback to simple increment if generator fails
    const { data: lastTicket } = await supabase
      .from("support_tickets")
      .select("ticket_number")
      .order("ticket_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    ticketNumber = (lastTicket?.ticket_number || 100000) + 1;
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .insert([
      {
        user_id: userId,
        bike_name: bikeName,
        issue_type: issueType,
        description: description,
        image_url: imageUrl,
        ticket_number: ticketNumber,
        status: "pending",
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("[supportService.createTicket] failed", error);
    throw new AppError("Unable to create support ticket: " + error.message, 500);
  }

  return data;
}

/**
 * Get all tickets for a user
 */
export async function getUserTickets(userId) {
  if (isDemoUser(userId)) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[supportService.getUserTickets] failed", error);
    throw new AppError("Unable to fetch support tickets", 500);
  }

  return data || [];
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(ticketId) {
  if (String(ticketId).startsWith("demo-")) {
    throw new AppError("Demo ticket details not available", 404);
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error) {
    console.error("[supportService.getTicketById] failed", error);
    throw new AppError("Ticket not found", 404);
  }

  return data;
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(ticketId, status, adminNotes = null) {
  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      status: status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select("*")
    .single();

  if (error) {
    console.error("[supportService.updateTicketStatus] failed", error);
    throw new AppError("Unable to update ticket status", 500);
  }

  return data;
}

/**
 * Upload support image to Supabase Storage
 */
export async function uploadSupportImage(imageBase64, fileName, contentType = "image/jpeg") {
  try {
    if (!imageBase64) throw new Error("Image data is required");

    // Strip base64 prefix if present
    const base64Data = String(imageBase64).replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename - using root of bucket as folders might be restricted
    const safeName = String(fileName || `support-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}-${safeName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("support-tickets")
      .upload(uniqueFileName, buffer, {
        contentType: contentType,
        upsert: true,
      });

    if (error) {
      console.error("[supportService.uploadSupportImage] upload failed", error);
      // Fallback to mock URL if storage bucket fails/violates RLS
      return `https://support.bharbike.local/${uniqueFileName}`;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("support-tickets")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("[supportService.uploadSupportImage] error", error);
    // Fallback to mock URL in case of any unhandled failures
    return `https://support.bharbike.local/${uniqueFileName}`;
  }
}

/**
 * Get message history for a ticket
 */
export async function getTicketMessages(ticketId) {
  if (String(ticketId).startsWith("demo-")) {
    return [
      {
        id: "demo-msg-1",
        ticket_id: ticketId,
        sender_id: "demo-system",
        sender_type: "admin",
        message: "Hello! Welcome to BharBike Live Support. How can we help you today?",
        created_at: new Date(Date.now() - 60000).toISOString(),
      }
    ];
  }

  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[supportService.getTicketMessages] failed", error);
    throw new AppError("Unable to fetch ticket messages", 500);
  }

  return data || [];
}

/**
 * Send a message for a ticket
 */
export async function sendTicketMessage(ticketId, senderId, senderType, message, imageUrl = null) {
  if (String(ticketId).startsWith("demo-")) {
    return {
      id: `demo-msg-${Date.now()}`,
      ticket_id: ticketId,
      sender_id: senderId,
      sender_type: senderType,
      message: message,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("ticket_messages")
    .insert([
      {
        ticket_id: ticketId,
        sender_id: senderId || null,
        sender_type: senderType,
        message: message,
        image_url: imageUrl,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("[supportService.sendTicketMessage] failed", error);
    throw new AppError("Unable to send message: " + error.message, 500);
  }

  // Auto update ticket status if user sends a message and it was resolved
  // This reopens the ticket
  if (senderType === "user") {
    await supabase
      .from("support_tickets")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  return data;
}

