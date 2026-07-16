import fs from "fs";

const files = [
  "./src/controllers/supportController.js",
  "./src/controllers/paymentAdminController.js"
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, "utf-8");
    console.log(`\n=== File: ${f} ===`);
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (line.includes("createSubscription") || line.includes("user_subscriptions") || line.includes("payment") || line.includes("status")) {
        if (line.includes("function") || line.includes("const ") || line.includes("export ")) {
          console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
});
