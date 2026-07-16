import axios from "axios";

async function testSupabaseDebug() {
  const url = "https://bharbike-backend.onrender.com/api/auth/debug-supabase";
  console.log(`Polling ${url} until new build is active...`);

  for (let i = 1; i <= 30; i++) {
    try {
      console.log(`[Attempt ${i}/30] Fetching debug info...`);
      const res = await axios.get(url, { timeout: 10000 });
      
      if (res.data && typeof res.data.queries !== "undefined") {
        console.log("SUCCESS! New live backend build is active!");
        console.log(JSON.stringify(res.data, null, 2));
        return;
      } else {
        console.log("Old backend build with isServiceRole is still active. Waiting for redeployment...");
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
  console.error("Failed to get new response from debug route after 30 attempts.");
}

testSupabaseDebug();
