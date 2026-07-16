import "dotenv/config";
import axios from "axios";
import https from "https";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;
const CF_AI_MODEL   = "@cf/llava-hf/llava-1.5-7b-hf";

const KYC_PROMPTS = {
  pan: {
    system: `You are a strict KYC document verification officer for an Indian bike rental company.
Your ONLY job is to determine if the uploaded image is a genuine Indian PAN Card.
A valid PAN Card MUST have: "INCOME TAX DEPARTMENT" text, "PERMANENT ACCOUNT NUMBER" text, a 10-char PAN number.
Respond ONLY in this exact JSON format: {"valid": true, "reason": "..."} OR {"valid": false, "reason": "..."}`,
    userPrompt: "Is this a valid Indian PAN Card? Respond in required JSON format."
  },
  selfie: {
    system: `You are a strict KYC verification officer. Your ONLY job is to determine if the uploaded image is a clear selfie of a real person.
A valid selfie MUST have: a clearly visible human face, looking at camera, good lighting.
Respond ONLY in this exact JSON format: {"valid": true, "reason": "..."} OR {"valid": false, "reason": "..."}`,
    userPrompt: "Is this a valid selfie with a clearly visible face? Respond in required JSON format."
  }
};

// Download a small test image from the web
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function testKYCVerification(imageBuffer, docType, testName) {
  const prompt = KYC_PROMPTS[docType];
  console.log(`\n${"=".repeat(50)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Image size: ${imageBuffer.length} bytes`);
  console.log(`Model: ${CF_AI_MODEL}`);

  try {
    const imageArray = Array.from(new Uint8Array(imageBuffer));
    const fullPrompt = `${prompt.system}\n\nUser: ${prompt.userPrompt}\nAssistant:`;

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_AI_MODEL}`;
    const payload = { image: imageArray, prompt: fullPrompt, max_tokens: 200 };

    console.log("Calling Cloudflare AI...");
    const start = Date.now();
    const cfResponse = await axios.post(cfUrl, payload, {
      headers: { "Authorization": `Bearer ${CF_AI_TOKEN}`, "Content-Type": "application/json" },
      timeout: 45000
    });
    const elapsed = Date.now() - start;
    
    const aiText = cfResponse.data?.result?.description || "";
    console.log(`✅ AI responded in ${elapsed}ms`);
    console.log(`Raw AI response: "${aiText}"`);

    // Parse JSON
    const jsonMatch = aiText.match(/\{[\s\S]*?"valid"[\s\S]*?\}/);
    if (!jsonMatch) {
      console.log("⚠️  Could not parse JSON — treating as invalid");
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`Result: valid=${parsed.valid}`);
    console.log(`Reason: ${parsed.reason}`);
    console.log(parsed.valid ? "✅ DOCUMENT ACCEPTED → Status: Under Review" : "❌ DOCUMENT REJECTED → User told to re-upload");

  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
  }
}

async function main() {
  console.log("🔑 CF Account ID:", CF_ACCOUNT_ID);
  console.log("🔑 CF Token:", CF_AI_TOKEN?.slice(0, 20) + "...");

  // Test 1: A real image (using a publicly available small image as test)
  // We'll use a sample document-like image
  console.log("\n📥 Downloading test images...");
  
  try {
    // Test with a simple small PNG (1x1 pixel test to check API connectivity)
    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    await testKYCVerification(tinyPng, "pan", "1x1 tiny image (should REJECT — not a PAN card)");

    // Test 2: Slightly larger solid color image
    const solidImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+A9QDwYAJhAGAWjR9awAAAAASUVORK5CYII=",
      "base64"
    );
    await testKYCVerification(solidImage, "selfie", "Solid color image (should REJECT — no face)");

  } catch (err) {
    console.error("Fatal error:", err.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("TEST SUMMARY");
  console.log("=".repeat(50));
  console.log("If both tests showed ❌ REJECTED with a reason → AI is working correctly!");
  console.log("Upload a real PAN card image to see it get ✅ ACCEPTED.");
}

main();
