import * as subscriptionService from "../services/subscriptionService.js";
import * as rentalService from "../services/rentalService.js";

export async function runSubscriptionExpirySweep() {
  console.log("[jobs] Starting subscription expiry sweep...");
  try {
    // Mark past subscriptions as expired
    const expiredSubs = await subscriptionService.expireOldSubscriptions();

    if (expiredSubs && expiredSubs.length > 0) {
      for (const sub of expiredSubs) {
        try {
          await rentalService.forceExpireActiveRentalForUser(sub.user_id);
          await new Promise(r => setTimeout(r, 1000));
        } catch (rentalErr) {
          console.error(`[jobs] Error expiring rental for user ${sub.user_id}:`, rentalErr);
        }
      }
    }
  } catch (e) {
    console.error("[jobs] Error expiring old subscriptions:", e);
  }
}

export async function runSubscriptionWarningSweep() {
  console.log("[jobs] Starting subscription warning sweep...");
  try {
    // Send warning alerts for subscriptions ending in 2 days
    await subscriptionService.sendSubscriptionExpiryWarnings();
  } catch (e) {
    console.error("[jobs] Error sending subscription warnings:", e);
  }
}
