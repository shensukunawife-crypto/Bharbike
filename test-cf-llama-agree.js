import "dotenv/config";
import axios from "axios";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;

async function runAgreementAndTest() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;
  
  console.log("Step 1: Submitting 'agree' prompt to accept Meta Llama 3.2 license...");
  try {
    const agreementRes = await axios.post(url, {
      prompt: "agree"
    }, {
      headers: {
        "Authorization": `Bearer ${CF_AI_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ Agreement response:", agreementRes.data);
  } catch (err) {
    console.error("❌ Agreement call failed:");
    console.error(err.response?.data || err.message);
    return;
  }

  console.log("\nDownloading test image of a dog...");
  let imageBuffer;
  try {
    const imgRes = await axios.get("https://picsum.photos/id/237/200/300.jpg", {
      responseType: "arraybuffer",
      timeout: 15000
    });
    imageBuffer = Buffer.from(imgRes.data);
    console.log("✅ Image downloaded! Size:", imageBuffer.length);
  } catch (err) {
    console.error("Failed to download image:", err.message);
    return;
  }

  const promptSystem = `You are a strict KYC verification officer for an Indian bike rental company.
Your ONLY job is to determine if the uploaded image is a genuine Indian Aadhaar Card (front or back side).
Respond ONLY in this exact JSON format (no extra text):
{"valid": true, "reason": "Aadhaar Card verified successfully"}
OR
{"valid": false, "reason": "Brief explanation of what is wrong or missing"}`;

  const userPrompt = "Is this a valid Indian Aadhaar Card (front or back)? Analyze the document carefully and respond in the required JSON format.";

  const imageArray = Array.from(new Uint8Array(imageBuffer));

  console.log("\nStep 2: Calling Llama-3.2-11b-vision-instruct to verify the dog photo...");
  const start = Date.now();
  try {
    const res = await axios.post(url, {
      image: imageArray,
      prompt: `<image>\n${promptSystem}\n\nUser: ${userPrompt}\nAssistant:`,
      max_tokens: 150
    }, {
      headers: {
        "Authorization": `Bearer ${CF_AI_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });
    const elapsed = Date.now() - start;
    console.log(`✅ Success in ${elapsed}ms!`);
    console.log("AI Output:", res.data?.result?.description);
  } catch (err) {
    console.error(`❌ Failed!`);
    console.error(err.response?.data || err.message);
  }
}

runAgreementAndTest();
