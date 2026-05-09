/**
 * Canonical brand strings for the BhaरBike product monorepo (backend + shared docs).
 * Latin “Bha” + Devanagari “र” — never “BHA”, “Bhar”, or “bhar” in UI copy.
 */
export const BRAND_NAME = "Bhaर";

/** Product name when “Bike” follows the brand mark */
export const BRAND_PRODUCT_NAME = `${BRAND_NAME}Bike`;

/**
 * Normalize legacy API / DB / user-entered brand tokens.
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function formatBrand(text) {
  if (!text) return BRAND_NAME;
  const s = String(text).trim();
  if (!s) return BRAND_NAME;
  const upper = s.toUpperCase();
  if (upper.startsWith("BHA")) {
    return BRAND_NAME;
  }
  return text;
}
