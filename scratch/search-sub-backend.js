import fs from "fs";
import path from "path";

const BACKEND_DIR = "c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\src";

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

console.log("Searching for user_subscriptions usage in backend...");
walkDir(BACKEND_DIR, (filePath) => {
  const ext = path.extname(filePath);
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("user_subscriptions")) {
      console.log(`\nMatch found in: ${filePath}`);
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (line.includes("user_subscriptions") || line.includes("active")) {
          console.log(`  Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
