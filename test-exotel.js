import "dotenv/config";
import axios from "axios";

// Exotel Credentials from User's Screenshot (Corrected OCR digits)
const EXOTEL_API_KEY = "08b241add539b6a24bbd61a1214755cfd3c7cdc81214d288";
const EXOTEL_API_TOKEN = "98ba2c0785e29c1c9e2a890f059415b85a264692e92ce704";
const EXOTEL_ACCOUNT_SID = "bharbike1";
const EXOTEL_SUBDOMAIN = "api.exotel.com"; // Singapore cluster

async function sendTestSMS(toPhone, messageBody, senderId = "BHARBK", dltEntityId = "", dltTemplateId = "") {
  console.log(`\n==================================================`);
  console.log(`SENDING SMS TO: ${toPhone}`);
  console.log(`MESSAGE: "${messageBody}"`);
  console.log(`SENDER ID: ${senderId}`);
  console.log(`==================================================`);

  // Basic Auth Credentials
  const authHeader = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString("base64");
  const url = `https://${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Sms/send`;

  const params = new URLSearchParams();
  params.append("From", senderId);
  params.append("To", toPhone);
  params.append("Body", messageBody);
  
  if (dltEntityId) {
    params.append("DltEntityId", dltEntityId);
  }
  if (dltTemplateId) {
    params.append("DltTemplateId", dltTemplateId);
  }

  try {
    const res = await axios.post(url, params.toString(), {
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    console.log("✅ Exotel API responded successfully!");
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("❌ Exotel API Error:");
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error("Response data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

// Read phone number from CLI arguments or env
const targetPhone = process.argv[2] || process.env.TEST_PHONE;

if (!targetPhone) {
  console.log("⚠️ Please specify a target phone number to send the test SMS.");
  console.log("Usage: node test-exotel.js <phone_number> [message]");
  console.log("Example: node test-exotel.js +919876543210");
  process.exit(1);
}

const customMessage = process.argv[3] || "Your BharBike verification OTP is 584930. Valid for 10 minutes.";
const targetSender = process.argv[4] || "BHARBK";

sendTestSMS(targetPhone, customMessage, targetSender);
