import supabase from "../utils/supabaseClient.js";

/**
 * @deprecated import ../utils/supabaseClient.js directly.
 * Kept for existing imports + startup connection check.
 */
export default supabase;

/**
 * Lightweight non-blocking smoke test (single row probe). Does not block HTTP listen.
 */
export async function verifyRequiredTables() {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      console.error("[supabase] connection issue:", error.message);
    } else {
      console.log("[supabase] connection OK");
    }
  } catch (err) {
    console.error("[supabase] check failed:", err?.message ?? err);
  }
}
