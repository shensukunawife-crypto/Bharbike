import "dotenv/config";
import axios from "axios";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CF_AI_TOKEN;

async function testCF() {
  console.log("Account ID:", CF_ACCOUNT_ID);
  console.log("Token starts with:", CF_AI_TOKEN ? CF_AI_TOKEN.slice(0, 10) : "undefined");

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`;
    console.log("Testing LLaVA model call...");
    const res = await axios.post(url, {
      prompt: "Hello, reply with OK if you receive this.",
    }, {
      headers: {
        "Authorization": `Bearer ${CF_AI_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ Success! Response:", res.data);
  } catch (err) {
    console.error("❌ Failed!");
    console.error(err.response?.data || err.message);
  }
}

testCF();
