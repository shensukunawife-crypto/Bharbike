import Razorpay from "razorpay";

async function test() {
  const key_id = "rzp_test_SiURScJnPa0qqP";
  const key_secret = "OPu122gXMDERrOM449cSZQvH";
  console.log("Using Key ID:", key_id);
  console.log("Using Key Secret:", key_secret);

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
