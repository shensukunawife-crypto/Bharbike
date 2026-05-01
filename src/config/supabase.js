import supabase from "../utils/supabaseClient.js";

/**
 * @deprecated import ../utils/supabaseClient.js directly.
 * Kept for existing imports + startup table check.
 */
export default supabase;

const REQUIRED_TABLES = [
  "profiles",
  "users",
  "bikes",
  "rentals",
  "orders",
  "earnings",
  "delivery_requests",
];

export async function verifyRequiredTables() {
  if (
    !process.env.SUPABASE_URL ||
    !(
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  ) {
    console.error(
      "[supabase] SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY) are required",
    );
    return false;
  }

  const results = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
      return { table, error };
    }),
  );
  const missing = [];
  for (const { table, error } of results) {
    if (error) {
      console.error(`[supabase] table check failed for "${table}"`, error.message);
      missing.push(table);
    }
  }

  if (missing.length) {
    console.error(`[supabase] Missing/inaccessible tables: ${missing.join(", ")}`);
    return false;
  }
  console.log("[supabase] Required tables verified");
  return true;
}
