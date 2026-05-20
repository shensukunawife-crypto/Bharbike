import cron from "node-cron";
import { runRentalExpirySweep } from "./rentalExpiryJob.js";
import { runGpsRefreshJob } from "./gpsRefreshJob.js";

export function startScheduledJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      await runRentalExpirySweep();
    } catch (e) {
      console.error("[jobs] rental expiry sweep failed", e);
    }
  });
  console.log("[jobs] Scheduled: rental expiry (every minute)");

  // Refresh GPS location for all LocoNav-linked bikes every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runGpsRefreshJob();
    } catch (e) {
      console.error("[jobs] GPS refresh failed", e);
    }
  });
  console.log("[jobs] Scheduled: GPS location refresh (every 5 minutes)");
}
