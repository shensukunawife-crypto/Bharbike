import Razorpay from "razorpay";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

async function test() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  console.log("Using Key ID:", key_id);
  console.log("Using Key Secret length:", key_secret ? key_secret.length : 0);

  const razorpay = new Razorpay({
    key_id,
    key_secret,
  });

  try {
    const order = await razorpay.orders.create({
      amount: 50000,
      currency: "INR",
      receipt: "receipt_test_" + Date.now(),
    });
    console.log("SUCCESS creating Razorpay order:", order);
  } catch (err) {
    console.error("FAILED creating Razorpay order:", err);
  }
}

test();
