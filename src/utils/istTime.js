/**
 * IST (India Standard Time) Date Utilities
 * UTC+5:30 — All subscription/rental date boundaries must use these helpers
 * so dates never shift by a day due to UTC midnight vs IST midnight mismatch.
 *
 * RULES:
 *  - Use these helpers for: start_date, end_date, grace periods, day math.
 *  - Do NOT use for: created_at, updated_at, billing_date, paid_at (those are
 *    event timestamps — UTC is correct for DB storage of timestamps).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms

/**
 * Returns the current moment as a Date object anchored to IST midnight of today.
 * e.g. if it's 11:45 PM IST July 21, returns 2026-07-21T00:00:00+05:30
 */
export function nowIST() {
  return istMidnight(new Date());
}

/**
 * Normalizes any Date to IST midnight (00:00:00 IST) of the same calendar day.
 * This ensures "today" is always the correct IST calendar date.
 * @param {Date} date
 * @returns {Date}
 */
export function istMidnight(date) {
  // Get the IST date string (YYYY-MM-DD) for this moment
  const istStr = new Date(date.getTime() + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10); // "2026-07-21"
  // Return that date at midnight IST (= 18:30 UTC the previous day)
  return new Date(istStr + "T00:00:00+05:30");
}

/**
 * Adds N full calendar days (in IST) to the given date, returning IST midnight of that day.
 * @param {Date} date  - Source date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date}
 */
export function addISTDays(date, days) {
  const base = istMidnight(date);
  const result = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return istMidnight(result); // re-normalize to ensure clean midnight
}

/**
 * Returns the ISO string of the given date anchored at IST midnight.
 * Use this when storing start_date / end_date in Supabase.
 * @param {Date} date
 * @returns {string} ISO string e.g. "2026-07-21T00:00:00+05:30" or UTC equivalent
 */
export function toISOStrIST(date) {
  return istMidnight(date).toISOString();
}

/**
 * Returns the IST calendar date string (YYYY-MM-DD) for a given Date.
 * Useful for display and logging.
 * @param {Date} date
 * @returns {string} e.g. "2026-07-21"
 */
export function toISTDateStr(date) {
  return new Date(date.getTime() + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}
