import { runSubscriptionExpirySweep, runSubscriptionWarningSweep } from "../src/jobs/subscriptionExpiryJob.js";
import dotenv from "dotenv";

dotenv.config({ path: "C:/Users/ronit/Downloads/Telegram Desktop/BharBike (3)/BharBike (2)/BharBike/BharBike/bike rental system backend/.env" });

async function test() {
  console.log("Testing subscription expiry sweeps...");
  
  console.log("\n1. Testing runSubscriptionExpirySweep:");
  await runSubscriptionExpirySweep();
  
  console.log("\n2. Testing runSubscriptionWarningSweep:");
  await runSubscriptionWarningSweep();
  
  console.log("\nAll sweeps completed successfully!");
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
