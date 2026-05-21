import axios from "axios";

async function testLiveApi() {
  const url = "https://bharbike-backend.onrender.com/api/user/24f64805-d01a-45ff-b052-8c28ba344629";
  console.log(`Sending PUT to ${url}`);

  try {
    const res = await axios.put(url, {
      full_name: "Ron",
      email: "ron123@gmail.com",
      phone: "",
      location: "",
      image_url: "https://example.com/test.jpg"
    });
    console.log("PUT Response status:", res.status);
    console.log("PUT Response data:", res.data);
  } catch (err) {
    console.error("PUT Request failed!");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Headers:", err.response.headers);
      console.error("Data:", err.response.data);
    } else {
      console.error("Message:", err.message);
    }
  }
}

testLiveApi();
