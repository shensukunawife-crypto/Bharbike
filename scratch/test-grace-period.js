function hasPassedGracePeriod(endDateStr, nowOverride = null) {
  if (!endDateStr) return true;
  const end = new Date(endDateStr);
  const now = nowOverride ? new Date(nowOverride) : new Date();
  
  // The grace expiration is 9:30 AM IST (04:00 UTC) on the day AFTER the end date.
  const graceExp = new Date(end);
  graceExp.setDate(graceExp.getDate() + 1);
  graceExp.setUTCHours(4, 0, 0, 0); // 9:30 AM IST

  return now > graceExp;
}

// ---------------- TESTING ----------------

// Scenario: User bought subscription on July 11 at 2:00 PM IST (08:30 UTC)
// The end date is July 17 at 2:00 PM IST (08:30 UTC)
const endDate = "2026-07-17T08:30:00.000Z"; 

console.log("Subscription Officially Ends: July 17, 2026 at 2:00 PM IST");

const tests = [
  { name: "July 17 at 8:00 PM IST (Same day, evening)", time: "2026-07-17T14:30:00.000Z" },
  { name: "July 18 at 2:00 AM IST (Next day, early morning)", time: "2026-07-17T20:30:00.000Z" },
  { name: "July 18 at 8:00 AM IST (Next day, just before cutoff)", time: "2026-07-18T02:30:00.000Z" },
  { name: "July 18 at 9:29 AM IST (Next day, 1 minute before cutoff)", time: "2026-07-18T03:59:00.000Z" },
  { name: "July 18 at 9:31 AM IST (Next day, 1 minute AFTER cutoff)", time: "2026-07-18T04:01:00.000Z" },
  { name: "July 18 at 12:00 PM IST (Next day, afternoon)", time: "2026-07-18T06:30:00.000Z" }
];

console.log("\n--- Testing Grace Period ---");
tests.forEach(t => {
  const isExpired = hasPassedGracePeriod(endDate, t.time);
  console.log(`Checking at ${t.name} -> Locked out? ${isExpired ? "YES ❌ (Expired)" : "NO ✅ (Allowed to ride)"}`);
});
