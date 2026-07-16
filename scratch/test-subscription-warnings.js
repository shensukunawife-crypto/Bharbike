import dotenv from 'dotenv';
dotenv.config();

import { sendSubscriptionExpiryWarnings } from '../src/services/subscriptionService.js';

async function runTest() {
  console.log('--- Starting Subscription Expiry Warning Test ---');
  try {
    const targetMax = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    console.log(`Checking for subscriptions expiring before: ${targetMax}`);
    
    // Call the sweep function
    const sentCount = await sendSubscriptionExpiryWarnings();
    console.log('Sweep executed. Expiring subscriptions found:', sentCount.length);
    sentCount.forEach((sub, idx) => {
      console.log(`  Sub #${idx+1}: User ID: ${sub.user_id}, Expires: ${sub.end_date}`);
    });
    
    console.log('--- Test Completed Successfully ---');
  } catch (err) {
    console.error('Test failed with error:', err.message);
  }
}

runTest();
