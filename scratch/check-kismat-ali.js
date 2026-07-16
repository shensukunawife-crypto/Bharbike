import supabase from '../src/utils/supabaseClient.js';

async function checkKismat() {
  console.log("Checking Kismat Ali...");
  
  // 1. Find user
  const { data: users, error: err1 } = await supabase.rpc('exec_sql', {
    sql_query: "SELECT id, full_name, phone FROM users WHERE full_name ILIKE '%Kismat Ali%'"
  });
  
  if (err1 || !users || users.length === 0) {
    console.error("Error or no user found:", err1);
    return;
  }
  
  const userId = users[0].id;
  console.log("User:", users);
  
  // 2. Check recent payments
  const { data: payments, error: err2 } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id, amount, status, created_at, razorpay_payment_id FROM payments WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 3`
  });
  console.log("\nRecent Payments:", payments);
  
  // 3. Check subscriptions
  const { data: subs, error: err3 } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id, plan_id, status, start_date, end_date, created_at FROM user_subscriptions WHERE user_id = '${userId}' ORDER BY created_at DESC`
  });
  console.log("\nSubscriptions:", subs);
}

checkKismat();
