import axios from "axios";

const BASE_URL = "https://bharbike-backend.onrender.com/api";
const email = "test101@gmail.com";
const password = "test101@123";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING BHARBIKE API ENDPOINTS ONE BY ONE (PART 3 - RETEST)");
  console.log("==================================================");

  let token = "";
  let userId = "";

  // 1. Email Login
  console.log("\n1. Testing Email Login (/auth/email-login)...");
  try {
    const res = await axios.post(`${BASE_URL}/auth/email-login`, { email, password });
    if (res.data.success && res.data.data.token) {
      token = res.data.data.token;
      userId = res.data.data.user.id;
      console.log(`   ✅ SUCCESS: Logged in successfully!`);
    } else {
      console.error(`   ❌ FAILED: Unexpected response format:`, res.data);
      process.exit(1);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Advertisements
  console.log("\n2. Testing Advertisements Listing (/ads)...");
  try {
    const res = await axios.get(`${BASE_URL}/ads`);
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Advertisements fetched!`);
      console.log(`   Total Ads: ${res.data.data?.length || 0}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 3. Subscription Plans
  console.log("\n3. Testing Subscription Plans (/subscription/plans)...");
  try {
    const res = await axios.get(`${BASE_URL}/subscription/plans`);
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Subscription plans fetched!`);
      console.log(`   Plans: ${res.data.data?.map(p => `${p.name} (₹${p.price})`).join(", ") || "None"}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 4. Active Subscription
  console.log("\n4. Testing Active Subscription (/subscription/active)...");
  try {
    const res = await axios.get(`${BASE_URL}/subscription/active`, { headers });
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Active subscription status fetched!`);
      console.log(`   Has Subscription: ${res.data.data ? "Yes" : "No"}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 5. Subscription History
  console.log("\n5. Testing Subscription History (/subscription/history)...");
  try {
    const res = await axios.get(`${BASE_URL}/subscription/history`, { headers });
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Subscription history fetched!`);
      console.log(`   History count: ${res.data.data?.length || 0}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 6. Billing History
  console.log("\n6. Testing Billing History (/subscription/billing)...");
  try {
    const res = await axios.get(`${BASE_URL}/subscription/billing`, { headers });
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Billing history fetched!`);
      console.log(`   Billing records: ${res.data.data?.length || 0}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 7. Get Addresses List
  console.log("\n7. Testing Address Book Fetch (/addresses)...");
  try {
    const res = await axios.get(`${BASE_URL}/addresses`, { headers });
    if (res.data.success) {
      console.log(`   ✅ SUCCESS: Address book fetched!`);
      console.log(`   Total saved addresses: ${res.data.data?.length || 0}`);
    } else {
      console.error(`   ❌ FAILED:`, res.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  // 8. Create & Delete Test Address
  console.log("\n8. Testing Address CRUD Cycle (/addresses)...");
  try {
    const addressPayload = {
      name: "Office Hub",
      address_line: "123 Technology Park",
      city: "Mumbai",
      pincode: "400001",
      is_default: false
    };
    const createRes = await axios.post(`${BASE_URL}/addresses`, addressPayload, { headers });
    if (createRes.data.success && createRes.data.data?.id) {
      const addressId = createRes.data.data.id;
      console.log(`   ✅ SUCCESS: Address created! ID: ${addressId}`);

      // Delete the created address
      const deleteRes = await axios.delete(`${BASE_URL}/addresses/${addressId}`, { headers });
      if (deleteRes.data.success) {
        console.log(`   ✅ SUCCESS: Address deleted!`);
      } else {
        console.error(`   ❌ FAILED TO DELETE:`, deleteRes.data);
      }
    } else {
      console.error(`   ❌ FAILED TO CREATE:`, createRes.data);
    }
  } catch (err) {
    console.error(`   ❌ FAILED:`, err.response?.data || err.message);
  }

  console.log("\n==================================================");
  console.log("🏁 END OF ENDPOINT TESTS (PART 3 - RETEST)");
  console.log("==================================================");
}

runTests();
