import { execSync } from "child_process";

const buildId = "2472a2c6-5b95-43cd-a518-e2c5b61cdfa7";

async function poll() {
  console.log(`=== STARTING BACKGROUND POLLING FOR BUILD ${buildId} ===`);
  
  let attempts = 0;
  const maxAttempts = 30; // 15 minutes max
  
  const timer = setInterval(() => {
    attempts++;
    console.log(`[Poll #${attempts}] Checking build status...`);
    
    try {
      const output = execSync(`npx eas-cli build:view ${buildId} --json`, { encoding: "utf8" });
      const build = JSON.parse(output);
      
      console.log(`[Status]: ${build.status}`);
      
      if (build.status === "FINISHED") {
        clearInterval(timer);
        console.log("\n=============================================");
        console.log("🎉 SUCCESS: EAS Android Build Completed!");
        console.log(`Install Link: ${build.artifacts?.buildUrl || "https://expo.dev/accounts/eres07/projects/BharBike/builds/" + buildId}`);
        console.log("=============================================");
        process.exit(0);
      }
      
      if (build.status === "FAILED") {
        clearInterval(timer);
        console.error("\n❌ ERROR: EAS Android Build Failed!");
        process.exit(1);
      }
      
    } catch (err) {
      console.warn("⚠️ Polling warning (request failed):", err.message);
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(timer);
      console.error("❌ TIMEOUT: Build exceeded maximum wait time.");
      process.exit(1);
    }
    
  }, 30000); // Poll every 30 seconds
}

poll();
