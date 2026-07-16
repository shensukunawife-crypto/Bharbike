import fs from "fs";

const content = fs.readFileSync("./src/services/subscriptionService.js", "utf-8");
const lines = content.split("\n");

lines.forEach((line, idx) => {
  if (line.includes("export async function createSubscription")) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
