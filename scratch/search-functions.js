import fs from "fs";
import path from "path";

const files = [
  "c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\setup-database.sql",
  "c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\migrations\\create_wallet_system.sql"
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`\n=== Functions in ${path.basename(file)} ===`);
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      if (line.includes("CREATE FUNCTION") || line.includes("CREATE OR REPLACE FUNCTION")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
});
