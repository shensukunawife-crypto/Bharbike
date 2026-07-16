import axios from "axios";

async function testRazorpayDebug() {
  const url = "https://bharbike-backend.onrender.com/api/auth/debug-razorpay";
  console.log(`Polling ${url} until new build is active...`);

  for (let i = 1; i <= 30; i++) {
    try {
      console.log(`[Attempt ${i}/30] Fetching debug info...`);
      const res = await axios.get(url, { timeout: 10000 });
      
      if (res.data && res.data.success) {
        console.log("SUCCESS! New live backend build is active!");
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }
    } catch (err) {
      if (err.response) {
        console.log(`Backend status: ${err.response.status}`);
      } else {
        console.log(`Connection: ${err.message}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

testRazorpayDebug();
