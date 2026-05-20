import supabase from "../src/utils/supabaseClient.js";
import { createUserNotification } from "../src/services/notificationService.js";

async function runTest() {
  console.log("🚀 Running Notifications Flow Verification Script...");

  // 1. Fetch a valid user from the database
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name, phone")
    .limit(1);

  if (userError) {
    console.error("❌ Failed to query users table:", userError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.error("❌ No users found in the database. Please sign up a user first.");
    process.exit(1);
  }

  const testUser = users[0];
  const userId = testUser.id;
  console.log(`✅ Using Test User: ${testUser.full_name || "Unnamed"} (ID: ${userId}, Phone: ${testUser.phone})`);

  // 2. Insert test notifications across types
  console.log("\n📬 Creating Wallet Notification...");
  const n1 = await createUserNotification(
    userId,
    "Test Wallet Notification",
    "₹500 has been added to your wallet successfully via: Test Razorpay Gateway",
    "wallet"
  );
  if (n1) {
    console.log("✅ Wallet notification created:", n1.id);
  } else {
    console.error("❌ Failed to create wallet notification.");
  }

  console.log("\n📬 Creating Subscription Notification...");
  const n2 = await createUserNotification(
    userId,
    "Test Subscription Activated! 🚲",
    "Your Weekly Plan subscription has been activated! Enjoy unlimited rides and premium modules.",
    "success"
  );
  if (n2) {
    console.log("✅ Subscription notification created:", n2.id);
  } else {
    console.error("❌ Failed to create subscription notification.");
  }

  console.log("\n📬 Creating Kyc/Delivery Notification...");
  const n3 = await createUserNotification(
    userId,
    "Test Application Submitted",
    "Your delivery partner application has been successfully submitted and is under review.",
    "kyc"
  );
  if (n3) {
    console.log("✅ Kyc/Delivery notification created:", n3.id);
  } else {
    console.error("❌ Failed to create kyc notification.");
  }

  // 3. Query the notifications back from Supabase
  console.log("\n🔍 Querying notifications back from database...");
  const { data: list, error: listError } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (listError) {
    console.error("❌ Failed to query notifications table:", listError.message);
    process.exit(1);
  }

  console.log(`✅ Query Successful! Found ${list?.length || 0} recent notifications for user.`);
  if (list && list.length > 0) {
    list.forEach((n, idx) => {
      console.log(`\n  [#${idx + 1}] ID: ${n.id}`);
      console.log(`      Title: ${n.title}`);
      console.log(`      Type:  ${n.type}`);
      console.log(`      Body:  ${n.body}`);
      console.log(`      Msg:   ${n.message}`);
      console.log(`      Read:  ${n.read} / is_read: ${n.is_read}`);
    });
  }

  console.log("\n🏁 End-to-end notifications system validation completed successfully!");
}

runTest();
