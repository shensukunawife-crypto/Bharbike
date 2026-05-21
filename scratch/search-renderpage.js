import fs from "fs";

const content = fs.readFileSync("c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\src\\admin\\controllers\\adminController.js", "utf-8");
const lines = content.split("\n");

console.log("=== Matching renderPage ===");
lines.forEach((line, index) => {
  if (line.includes("renderPage")) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
