import "dotenv/config";
import axios from "axios";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;

async function testDirectLlama() {
  console.log("Downloading test image of a dog...");
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
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;

  console.log("\nCalling Llama-3.2-11b-vision-instruct...");
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
    console.log("✅ Success!");
    console.log("Full Res Data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(`❌ Failed!`);
    console.error(err.response?.data || err.message);
  }
}

testDirectLlama();
