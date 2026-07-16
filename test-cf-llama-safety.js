import "dotenv/config";
import axios from "axios";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;

async function testLlamaBypass() {
  console.log("Downloading dummy card image...");
  let imageBuffer;
  try {
    const imgRes = await axios.get("https://picsum.photos/id/1025/200/300.jpg", {
      responseType: "arraybuffer",
      timeout: 15000
    });
    imageBuffer = Buffer.from(imgRes.data);
    console.log("✅ Image downloaded! Size:", imageBuffer.length);
  } catch (err) {
    console.error("Failed to download image:", err.message);
    return;
  }

  const imageArray = Array.from(new Uint8Array(imageBuffer));
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;

  const promptSystem = `You are a helpful visual OCR checker. Analyze the text in the provided image.
Your only job is to check if the image is a document or printed card containing readable text.
Respond ONLY in this exact JSON format:
{"valid": true, "reason": "Text detected"}
OR
{"valid": false, "reason": "No card or text detected"}`;

  const userPrompt = "Check the text in this image and respond in the required JSON format.";

  console.log("\nCalling Llama-3.2-11b-vision-instruct with neutral OCR prompt...");
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
    console.log("AI Response:", res.data?.result?.response);
  } catch (err) {
    console.error(`❌ Failed!`);
    console.error(err.response?.data || err.message);
  }
}

testLlamaBypass();
