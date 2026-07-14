import fs from "fs";

const content = fs.readFileSync("./src/admin/controllers/adminController.js", "utf-8");
const lines = content.split("\n");

console.log("Searching for keywords in adminController.js...");
lines.forEach((line, idx) => {
  if (line.includes("ticket") || line.includes("Payment") || line.includes("approve") || line.includes("subscription")) {
    if (line.includes("async ") || line.includes("function ")) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
