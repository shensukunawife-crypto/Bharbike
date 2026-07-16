import jwt from "jsonwebtoken";
import axios from "axios";

const secret = "BharBike_Secure_Session_2026_9e8d4f2a1b5c7d8e9f0a1b2c3d4e5f6g";
const testUserId = "e845de2c-2846-472a-b701-63c468b4f219"; // Adil Ansari

async function main() {
  const token = jwt.sign({ sub: testUserId, phone: "+918630536558" }, secret, { expiresIn: "1h" });
  
  console.log("Generated JWT:", token);
  
  const payload = {
    full_name: "Adil Ansari Test",
    email: "adil_live_test@gmail.com",
    location: "Mumbai Test Location",
    address: "Mumbai Test Location",
    password: "password123"
  };

  try {
    console.log("Sending PUT request to live backend...");
    const res = await axios.put(`https://bharbike-backend.onrender.com/api/user/${testUserId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    console.log("Live Backend Response status:", res.status);
    console.log("Live Backend Response data:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Live Backend Error response status:", err.response.status);
      console.error("Live Backend Error response data:", err.response.data);
    } else {
      console.error("Request failed:", err.message);
    }
  }
}

main();
