import fs from "fs";
import path from "path";

const searchStr = "user_subscriptions";
const rootDir = "./src";

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".ejs")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes(searchStr)) {
        console.log(`Found "${searchStr}" in: ${fullPath}`);
      }
    }
  }
}

console.log("Searching codebase...");
searchDir(rootDir);
