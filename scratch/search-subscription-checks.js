import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = 'C:\\BharFront\\src';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

console.log("Searching for subscription checks in frontend...");
walkDir(FRONTEND_SRC, (filePath) => {
  const ext = path.extname(filePath);
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("sub") || content.includes("plan") || content.includes("active")) {
      const lines = content.split("\n");
      let matches = [];
      lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.includes("has_active_subscription") ||
          lowerLine.includes("subscription") ||
          lowerLine.includes("active_subscription") ||
          lowerLine.includes("active-sub") ||
          lowerLine.includes("weekly_plan")
        ) {
          matches.push(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
      if (matches.length > 0) {
        console.log(`\nMatch found in: ${filePath}`);
        matches.forEach(m => console.log(m));
      }
    }
  }
});
