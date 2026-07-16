import supabase from '../src/utils/supabaseClient.js';

async function checkAhemad() {
  const { data: users } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id, full_name, phone FROM users WHERE full_name ILIKE '%tauseeb%' OR full_name ILIKE '%ahemad%' OR full_name ILIKE '%khan%' AND full_name ILIKE '%mohammad%'`
  });
  console.log("Users found:", users);

  if (!users || users.length === 0) return;
  const userId = users[0].id;

  // Get ALL subscription records (not just current)
  const { data: subs } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT id, plan_id, status, start_date, end_date, created_at FROM user_subscriptions WHERE user_id = '${userId}' ORDER BY created_at ASC`
  });
  console.log("\nAll Subscription Records:");
  subs?.forEach((s, i) => console.log(`  #${i+1}:`, s));

  // Get payments too
  const { data: payments } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT amount, status, created_at FROM payments WHERE user_id = '${userId}' ORDER BY created_at DESC`
  });
  console.log("\nPayments:", payments);
}

checkAhemad();
