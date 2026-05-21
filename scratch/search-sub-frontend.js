import fs from "fs";
import path from "path";

const FRONTEND_DIR = "c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\BharBike  franted\\src";

function walkDir(dir, callback) {
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

console.log("Searching for subscription usage in frontend...");
walkDir(FRONTEND_DIR, (filePath) => {
  const ext = path.extname(filePath);
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("subscription") || content.includes("/subscription/")) {
      console.log(`\nMatch found in: ${filePath}`);
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (line.includes("subscription") || line.includes("/subscription/")) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
