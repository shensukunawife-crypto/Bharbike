import supabase from "./supabaseClient.js";

const MAX_PICKS = 200;

/**
 * 6 digits only, 100000–999999. Uniqueness enforced by DB + pre-check.
 * Uses maybeSingle: .single() would error when no row (PostgREST PGRST116).
 */
export async function generateTicketNumber() {
  let number;
  let exists = true;
  let tries = 0;
  while (exists && tries < MAX_PICKS) {
    tries += 1;
    number = Math.floor(100000 + Math.random() * 900000);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("ticket_number")
      .eq("ticket_number", number)
      .maybeSingle();
    if (error) throw error;
    if (!data) exists = false;
  }
  if (exists) {
    throw new Error("Could not generate unique ticket number");
  }
  return number;
}

/** @deprecated use generateTicketNumber */
export const generateUniqueTicketNumber = generateTicketNumber;

export function isUniqueViolation(err) {
  const code = err?.code;
  const msg = String(err?.message || "").toLowerCase();
  return code === "23505" || msg.includes("unique") || msg.includes("duplicate");
}

export function isMissingTicketNumberColumnError(err) {
  if (isUniqueViolation(err)) {
    return false;
  }
  const code = String(err?.code || "");
  if (code === "42703" || code === "PGRST204") {
    return true;
  }
  const m = String(err?.message || err?.details || err?.hint || err || "").toLowerCase();
  if (!m) return false;
  if (m.includes("duplicate") || m.includes("already exists")) {
    return false;
  }
  if (m.includes("ticket_number")) {
    return (
      m.includes("column") ||
      m.includes("does not exist") ||
      m.includes("could not find") ||
      m.includes("schema cache") ||
      m.includes("pgrst")
    );
  }
  if (m.includes("schema cache") && m.includes("support_tickets")) {
    return true;
  }
  if (m.includes("42703") || m.includes("undefined column")) {
    return true;
  }
  return false;
}
