import cron from "node-cron";
import { runRentalExpirySweep } from "./rentalExpiryJob.js";

export function startScheduledJobs() {
  cron.schedule("* * * * *", async () => {
    try {
      await runRentalExpirySweep();
    } catch (e) {
      console.error("[jobs] rental expiry sweep failed", e);
    }
  });
  console.log("[jobs] Scheduled: rental expiry (every minute)");
}
