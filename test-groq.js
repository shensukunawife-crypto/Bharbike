import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function test() {
  const start = Date.now();
  console.log("Starting simple request...");
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "hey" }],
      model: "llama-3.3-70b-versatile"
    });
    console.log("Llama 3.3 70B Time:", Date.now() - start, "ms");
    console.log("Response:", chatCompletion.choices[0].message.content);
  } catch (err) {
    console.error("Error with llama 3.3:", err.message);
  }

  const start2 = Date.now();
  try {
    const chatCompletion2 = await groq.chat.completions.create({
      messages: [{ role: "user", content: "hey" }],
      model: "openai/gpt-oss-120b"
    });
    console.log("120b Time:", Date.now() - start2, "ms");
    console.log("Response:", chatCompletion2.choices[0].message.content);
  } catch (err) {
    console.error("Error with 120b:", err.message);
  }
}

test();
