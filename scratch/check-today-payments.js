import supabase from '../src/utils/supabaseClient.js';

async function checkTodayPayments() {
  const today = '2026-07-15';
  
  // Get successful payments from today
  const { data: payments } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT user_id, amount, created_at FROM payments WHERE status = 'success' AND created_at >= '${today}T00:00:00Z'`
  });
  
  if (!payments || payments.length === 0) {
    console.log("No successful payments found for today.");
    return;
  }
  
  console.log(`Found ${payments.length} successful payments today.`);
  
  for (const pay of payments) {
    if (!pay.user_id) continue;
    const { data: users } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT full_name, phone FROM users WHERE id = '${pay.user_id}'`
    });
    const user = users && users.length ? users[0] : { full_name: 'Unknown', phone: 'Unknown' };
    
    const { data: subs } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT plan_id, status, start_date, end_date FROM user_subscriptions WHERE user_id = '${pay.user_id}'`
    });
    const sub = subs && subs.length ? subs[0] : null;
    
    console.log(`\nUser: ${user.full_name} (${user.phone})`);
    console.log(`Payment: ₹${pay.amount} at ${pay.created_at}`);
    if (sub) {
      console.log(`Subscription: ${sub.plan_id} (${sub.status}) | ${sub.start_date} TO ${sub.end_date}`);
    } else {
      console.log(`Subscription: NONE`);
    }
  }
}

checkTodayPayments();
