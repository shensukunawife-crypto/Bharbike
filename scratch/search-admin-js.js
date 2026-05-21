import fs from "fs";

const content = fs.readFileSync("c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\src\\admin\\public\\js\\admin.js", "utf-8");
const lines = content.split("\n");

console.log("=== Matching in admin.js ===");
lines.forEach((line, index) => {
  if (line.includes("edit-admin") || line.includes("open-edit-admin") || line.includes("admin-modal") || line.includes("admin-form")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
