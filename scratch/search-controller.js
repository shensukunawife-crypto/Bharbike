import fs from "fs";
import path from "path";

const files = [
  "./src/controllers/paymentController.js",
  "./src/controllers/subscriptionController.js",
  "./src/controllers/skippedDaysController.js"
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, "utf-8");
    const lines = content.split("\n");
    console.log(`\n=== Keywords in ${f} ===`);
    lines.forEach((line, idx) => {
      if (line.includes("user_subscriptions") || line.includes("start_date") || line.includes("end_date") || line.includes("createSubscription")) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
