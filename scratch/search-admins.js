import fs from "fs";

const content = fs.readFileSync("c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\src\\admin\\controllers\\adminController.js", "utf-8");
const lines = content.split("\n");

console.log("=== Matching adminsPage ===");
lines.forEach((line, index) => {
  if (line.includes("adminsPage") || line.includes("addAdmin") || line.includes("editAdmin") || line.includes("toggleAdmin")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
