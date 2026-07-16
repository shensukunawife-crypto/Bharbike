import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const USER_ID = "58d87fe5-e81b-4ed9-b129-2f813825598c";
const jwtSecret = process.env.JWT_SECRET || "BharBike_Secure_Session_2026_9e8d4f2a1b5c7d8e9f0a1b2c3d4e5f6g";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "30d";

async function testApiCall() {
  const token = jwt.sign(
    { phone: null },
    jwtSecret,
    { subject: USER_ID, expiresIn: jwtExpiresIn }
  );

  console.log("Generated JWT Token:", token);

  // Let's call the live Render backend api!
  try {
    const res = await axios.get("https://bharbike-backend.onrender.com/api/wallet/summary", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Live API Summary Response:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Live API Summary Call Failed:", err?.response?.data || err.message);
  }
}

testApiCall();
