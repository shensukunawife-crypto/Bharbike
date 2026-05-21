import supabase from "../src/utils/supabaseClient.js";

async function testUpdate() {
  const userId = "24f64805-d01a-45ff-b052-8c28ba344629";
  
  // Let's mimic what the user is updating
  // Say, updating image_url to a dummy URL, name to 'Ron', email to 'ron123@gmail.com', phone to '', location to ''
  const profilesPatch = {
    full_name: "Ron",
    email: "ron123@gmail.com",
    phone: "",
    location: "",
    image_url: "https://example.com/test.jpg"
  };

  const usersPatch = {
    full_name: "Ron",
    email: "ron123@gmail.com",
    phone: "",
    location: ""
  };

  console.log("Testing profiles update...");
  const { data: pData, error: pErr } = await supabase
    .from("profiles")
    .update(profilesPatch)
    .eq("id", userId)
    .select();

  if (pErr) {
    console.error("Profiles update failed:", pErr);
  } else {
    console.log("Profiles update succeeded:", pData);
  }

  console.log("Testing users update...");
  const { data: uData, error: uErr } = await supabase
    .from("users")
    .update(usersPatch)
    .eq("id", userId)
    .select();

  if (uErr) {
    console.error("Users update failed:", uErr);
  } else {
    console.log("Users update succeeded:", uData);
  }
}

testUpdate();
