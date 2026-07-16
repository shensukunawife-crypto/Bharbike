import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";
import * as walletService from "./src/services/walletService.js";

async function runTest() {
  console.log("=== STARTING WALLET FIX TEST ===");

  try {
    // 1. Fetch a user ID from the database
    const { data: users, error: userErr } = await supabase.from("users").select("id, email, name").limit(1);
    if (userErr) {
      throw new Error(`Failed to fetch test user: ${userErr.message}`);
    }

    if (!users || users.length === 0) {
      console.warn("⚠️ No users found in database. Creating a mock UUID for testing...");
      users.push({ id: "00000000-0000-0000-0000-000000000000", email: "mock@example.com", name: "Mock User" });
    }

    const testUser = users[0];
    console.log(`Using Test User: ${testUser.name} (${testUser.email}), ID: ${testUser.id}`);

    // 2. Fetch balance using our fixed getWalletBalance
    console.log("\n--- Testing getWalletBalance() ---");
    const balanceInfo = await walletService.getWalletBalance(testUser.id);
    console.log("Returned balanceInfo:", balanceInfo);
    console.log(`Type of balance: ${typeof balanceInfo.balance}, Value: ${balanceInfo.balance}`);

    if (typeof balanceInfo.balance !== "number" || Number.isNaN(balanceInfo.balance)) {
      console.error("❌ FAIL: Balance is not a valid number!");
    } else {
      console.log("✅ PASS: Balance is a valid number.");
    }

    // 3. Test getWalletSummary()
    console.log("\n--- Testing getWalletSummary() ---");
    const summary = await walletService.getWalletSummary(testUser.id);
    console.log("Returned summary:", summary);
    if (typeof summary.balance !== "number") {
      console.error("❌ FAIL: Summary balance is not a number!");
    } else {
      console.log("✅ PASS: Summary balance is a valid number.");
    }

    // 4. Test addMoney simulation (recharge)
    console.log("\n--- Testing addMoney() Simulation ---");
    const testAmount = 50;
    const testTitle = `Test Recharge ${Date.now()}`;
    const result = await walletService.addMoney(testUser.id, testAmount, testTitle);
    console.log("addMoney RPC Result:", result);

    // 5. Re-fetch balance and verify it increased
    let newBalanceInfo = await walletService.getWalletBalance(testUser.id);
    console.log("New balanceInfo after recharge:", newBalanceInfo);

    if (newBalanceInfo.balance === balanceInfo.balance + testAmount) {
      console.log(`✅ PASS: Balance increased correctly by ₹${testAmount} (From ₹${balanceInfo.balance} to ₹${newBalanceInfo.balance})`);
    } else {
      console.error(`❌ FAIL: Balance did not increase correctly! Expected ₹${balanceInfo.balance + testAmount}, got ₹${newBalanceInfo.balance}`);
    }

    // 6. Test deductMoney simulation
    console.log("\n--- Testing deductMoney() Simulation ---");
    const deductAmount = 20;
    const deductTitle = `Test Deduction ${Date.now()}`;
    const deductResult = await walletService.deductMoney(testUser.id, deductAmount, deductTitle);
    console.log("deductMoney RPC Result:", deductResult);

    // 7. Re-fetch balance and verify it decreased
    const finalBalanceInfo = await walletService.getWalletBalance(testUser.id);
    console.log("Final balanceInfo after deduction:", finalBalanceInfo);

    if (finalBalanceInfo.balance === newBalanceInfo.balance - deductAmount) {
      console.log(`✅ PASS: Balance decreased correctly by ₹${deductAmount} (From ₹${newBalanceInfo.balance} to ₹${finalBalanceInfo.balance})`);
    } else {
      console.error(`❌ FAIL: Balance did not decrease correctly! Expected ₹${newBalanceInfo.balance - deductAmount}, got ₹${finalBalanceInfo.balance}`);
    }

  } catch (error) {
    console.error("❌ TEST RUN ERROR:", error);
  }

  console.log("\n=== WALLET FIX TEST COMPLETE ===");
}

runTest();
