import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "../src/config/firebase-service-account.json");

try {
  const content = readFileSync(filePath, "utf8");
  console.log("Local file length:", content.length);
  
  // Print 40 characters around position 1286 in the local file
  const pos = 1286;
  if (content.length > pos) {
    const start = Math.max(0, pos - 40);
    const end = Math.min(content.length, pos + 40);
    console.log(`Snippet around index ${pos} in local file:`);
    console.log("-----------------------------------------");
    console.log(content.substring(start, end));
    console.log("-----------------------------------------");
  } else {
    console.log("Local file is shorter than 1286 characters!");
  }
} catch (err) {
  console.error("Error reading file:", err.message);
}
