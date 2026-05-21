import fs from "fs";
import path from "path";

const dir = "c:/Users/ronit/Downloads/Telegram Desktop/BharBike (3)/BharBike (2)/BharBike/BharBike/BharBike  franted/src/app";

function searchDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("SafeAreaView")) {
        console.log(`- File: ${path.relative(dir, filePath)}`);
        
        // Let's also check if it uses useSafeAreaInsets
        const usesInsets = content.includes("useSafeAreaInsets");
        console.log(`  Uses useSafeAreaInsets: ${usesInsets ? "✅ Yes" : "❌ No"}`);
        
        // Let's check for ScrollView or FlatList or touchable buttons at bottom
        const hasScrollView = content.includes("ScrollView");
        const hasFlatList = content.includes("FlatList");
        console.log(`  Has ScrollView: ${hasScrollView}, Has FlatList: ${hasFlatList}`);
      }
    }
  }
}

console.log("=== Finding screens importing SafeAreaView ===");
searchDir(dir);
