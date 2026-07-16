import axios from "axios";

async function testFirebaseDebug() {
  const url = "https://bharbike-backend.onrender.com/api/auth/firebase-debug";
  console.log(`Polling ${url} until new build with self-healing is active...`);

  for (let i = 1; i <= 30; i++) {
    try {
      console.log(`[Attempt ${i}/30] Fetching debug info...`);
      const res = await axios.get(url, { timeout: 10000 });
      
      // If the new build is active and successfully initialized
      if (res.data && res.data.success === true && res.data.initialized === true) {
        console.log("🎉 SUCCESS!!! Live backend is fully initialized and active!");
        console.log(JSON.stringify(res.data, null, 2));
        return;
      } else {
        console.log("Backend responded with:", JSON.stringify(res.data));
        console.log("Waiting for redeployment...");
      }
    } catch (err) {
      if (err.response) {
        console.log(`Backend responded with error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      } else {
        console.log(`Connection failed: ${err.message}`);
      }
    }
    // Wait 5 seconds before next retry
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.error("Failed to get successful response from debug route after 30 attempts.");
}

testFirebaseDebug();
