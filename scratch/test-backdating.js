function simulateSubscriptionCreation(testCaseName, lastSubEndDate, hasActiveRental, planDurationDays) {
  console.log(`\n--- Test Case: ${testCaseName} ---`);
  console.log(`Past Sub End Date: ${lastSubEndDate ? lastSubEndDate.toISOString() : "None"}`);
  console.log(`Has Active Rental: ${hasActiveRental}`);
  console.log(`Plan Duration: ${planDurationDays} days`);

  let startDate = new Date(); // Represents "Today"

  if (lastSubEndDate) {
    if (hasActiveRental) {
      startDate = new Date(lastSubEndDate);
      console.log("-> Applied Smart Backdating");
    } else {
      console.log("-> Returned bike detected. NO Backdating (Started from Today)");
    }
  }

  const endDate = new Date(startDate);
  if (planDurationDays === 7) {
    // 7 days inclusive
    const expireMs = startDate.getTime() + 6 * 24 * 60 * 60 * 1000;
    endDate.setTime(expireMs);
  } else {
    endDate.setDate(endDate.getDate() + planDurationDays - 1);
  }

  const now = new Date();
  const subStatus = endDate > now ? "active" : "expired";

  console.log(`Resulting Start Date: ${startDate.toISOString()} (Local: ${startDate.toLocaleString()})`);
  console.log(`Resulting End Date:   ${endDate.toISOString()} (Local: ${endDate.toLocaleString()})`);
  console.log(`Resulting Status:     ${subStatus.toUpperCase()}`);
}

const today = new Date();

// Scenario 1: User pays 3 days late, still has bike (Active Rental)
const pastSub1 = new Date(today);
pastSub1.setDate(today.getDate() - 3); // Ended 3 days ago
simulateSubscriptionCreation("Paid 3 Days Late (Has Bike)", pastSub1, true, 7);

// Scenario 2: User pays 10 days late, still has bike (Active Rental)
const pastSub2 = new Date(today);
pastSub2.setDate(today.getDate() - 10); // Ended 10 days ago
simulateSubscriptionCreation("Paid 10 Days Late (Has Bike)", pastSub2, true, 7);

// Scenario 3: User returned bike 2 months ago, pays today (No Active Rental)
const pastSub3 = new Date(today);
pastSub3.setMonth(today.getMonth() - 2); // Ended 2 months ago
simulateSubscriptionCreation("Returned Bike 2 Months Ago", pastSub3, false, 7);

// Scenario 4: User renews exactly on time (Has Bike)
const pastSub4 = new Date(today); // Ends right now
simulateSubscriptionCreation("On-time Renewal", pastSub4, true, 7);

// Scenario 5: First time user (No previous sub)
simulateSubscriptionCreation("Brand New User", null, false, 7);
