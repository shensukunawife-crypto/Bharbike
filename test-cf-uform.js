import "dotenv/config";
import axios from "axios";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;

async function runTest(url, label, prompt) {
  console.log(`\nDownloading ${label}...`);
  let imageBuffer;
  try {
    const imgRes = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    imageBuffer = Buffer.from(imgRes.data);
    console.log(`✅ Size: ${imageBuffer.length} bytes`);
  } catch (err) {
    console.error("Failed to download image:", err.message);
    return;
  }

  const imageArray = Array.from(new Uint8Array(imageBuffer));
  const apiPath = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/unum/uform-gen2-qwen-500m`;

  try {
    const res = await axios.post(apiPath, {
      image: imageArray,
      prompt: prompt,
      max_tokens: 50
    }, {
      headers: {
        "Authorization": `Bearer ${CF_AI_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 20000
    });
    console.log(`AI Output: "${res.data?.result?.description}"`);
  } catch (err) {
    console.error("API failed:", err.message);
  }
}

async function startTests() {
  const dogUrl = "https://picsum.photos/id/237/200/300.jpg";
  const flowerUrl = "https://picsum.photos/id/1025/200/300.jpg"; // Corrected picsum ID
  const documentUrl = "https://raw.githubusercontent.com/shensukunawife-crypto/Bharbike/main/Rider%20Operations%20Detail.xlsx"; // wait, that's an xlsx. Let's use a public dummy id card image that doesn't restrict downloads
  const sampleCardUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e1/Signature_de_l%27accord_de_coop%C3%A9ration_de_recherche_entre_l%27EPFL_et_l%27IRD_%28cropped_to_card%29.jpg"; // public card/paper image
  const simpleTextUrl = "https://httpbin.org/image/png"; // httpbin returns a valid PNG grid with text

  const promptCheck = "Is this image a document, card, paper, page, or written text? Answer in exactly 1 word: YES or NO.";

  await runTest(dogUrl, "Dog Photo", promptCheck);
  await runTest(flowerUrl, "Landscape Photo", promptCheck);
  await runTest(simpleTextUrl, "Grid Image with text", promptCheck);
}

startTests();
