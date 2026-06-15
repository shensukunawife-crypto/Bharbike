import * as subscriptionService from "../services/subscriptionService.js";

export async function runSubscriptionExpirySweep() {
  console.log("[jobs] Starting subscription expiry sweep...");
  try {
    // 1. Mark past subscriptions as expired
    await subscriptionService.expireOldSubscriptions();
  } catch (e) {
    console.error("[jobs] Error expiring old subscriptions:", e);
  }

  try {
    // 2. Send warning alerts for subscriptions ending in 2 days
    await subscriptionService.sendSubscriptionExpiryWarnings();
  } catch (e) {
    console.error("[jobs] Error sending subscription warnings:", e);
  }
}
