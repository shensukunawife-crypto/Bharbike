import { getUserActiveSubscription, hasActiveSubscription } from "../src/services/subscriptionService.js";

async function run() {
  const userId = "3ac83c70-348c-431f-b952-2ec952fbd53e";
  console.log(`Checking subscription status for user: ${userId} ("Demo Rider")`);
  
  const sub = await getUserActiveSubscription(userId);
  console.log("\nActive subscription result:");
  console.log(JSON.stringify(sub, null, 2));
  
  const hasActive = await hasActiveSubscription(userId);
  console.log(`\nHas active subscription: ${hasActive}`);
}

run();
