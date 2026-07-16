import supabase from '../src/utils/supabaseClient.js';

async function checkDineshActivity() {
  const { data: users, error } = await supabase.rpc('exec_sql', {
    sql_query: "SELECT id, full_name, created_at, updated_at FROM users WHERE full_name ILIKE '%dinesh%' LIMIT 1"
  });
  
  if (!users || users.length === 0) {
    console.log("Dinesh not found.");
    return;
  }
  const dinesh = users[0];
  console.log("User:", dinesh);
  
  const userId = dinesh.id;
  
  const { data: orders } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT created_at FROM orders WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
  });
  console.log("Latest Order/Payment:", orders && orders.length ? orders[0].created_at : 'None');
  
  const { data: subs } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT created_at, updated_at FROM user_subscriptions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 1`
  });
  console.log("Subscription:", subs && subs.length ? subs[0] : 'None');
  
  const { data: wallet } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT updated_at FROM wallet_balances WHERE user_id = '${userId}' LIMIT 1`
  });
  console.log("Wallet:", wallet && wallet.length ? wallet[0].updated_at : 'None');
  
  const { data: rental } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT created_at FROM rentals WHERE user_id = '${userId}' AND status = 'ongoing' ORDER BY created_at DESC LIMIT 1`
  });
  console.log("Active Rental:", rental && rental.length ? rental[0].created_at : 'None');
}

checkDineshActivity();
