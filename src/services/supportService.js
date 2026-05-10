import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";

/**
 * Create a support ticket
 */
export async function createTicket(userId, bikeId, bikeName, issueType, description, imageUrl = null) {
  // Generate ticket number
  const { data: lastTicket } = await supabase
    .from("support_tickets")
    .select("ticket_number")
    .order("ticket_number", { ascending: false })
    .limit(1)
    .single();

  const ticketNumber = (lastTicket?.ticket_number || 0) + 1;

  const { data, error } = await supabase
    .from("support_tickets")
    .insert([
      {
        user_id: userId,
        bike_id: bikeId,
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
    throw new AppError("Unable to create support ticket", 500);
  }

  return data;
}

/**
 * Get all tickets for a user
 */
export async function getUserTickets(userId) {
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
    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, "base64");

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `support/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("support-images")
      .upload(uniqueFileName, buffer, {
        contentType: contentType,
        upsert: false,
      });

    if (error) {
      console.error("[supportService.uploadSupportImage] upload failed", error);
      throw new AppError("Image upload failed", 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("support-images")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("[supportService.uploadSupportImage] error", error);
    throw new AppError("Image upload failed", 500);
  }
}
