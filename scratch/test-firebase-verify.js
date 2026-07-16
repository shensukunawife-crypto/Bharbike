import axios from "axios";

async function testFirebaseVerifyEndpoint() {
  const url = "https://bharbike-backend.onrender.com/api/auth/firebase-verify";
  console.log(`Sending POST to ${url} with dummy token...`);

  try {
    const res = await axios.post(url, {
      idToken: "dummy-invalid-token-123456"
    });
    console.log("Response status:", res.status);
    console.log("Response data:", res.data);
  } catch (err) {
    console.error("POST Request failed!");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    } else {
      console.error("Message:", err.message);
    }
  }
}

testFirebaseVerifyEndpoint();
