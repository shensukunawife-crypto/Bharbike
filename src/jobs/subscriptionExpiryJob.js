import * as subscriptionService from "../services/subscriptionService.js";

export async function runSubscriptionExpirySweep() {
  console.log("[jobs] Starting subscription expiry sweep...");
  try {
    // Mark past subscriptions as expired
    await subscriptionService.expireOldSubscriptions();
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
