import fs from "fs";

const file = "c:\\Users\\ronit\\Downloads\\Telegram Desktop\\BharBike (3)\\BharBike (2)\\BharBike\\BharBike\\bike rental system backend\\DEPLOYMENT_GUIDE.md";
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes("sql") || line.toLowerCase().includes("database") || line.toLowerCase().includes("supabase")) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
}
