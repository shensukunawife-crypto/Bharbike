import supabase from '../src/utils/supabaseClient.js';

async function checkColumns(tableName) {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}'`
  });
  
  if (error) {
    console.error(`Error fetching columns for ${tableName}:`, error.message);
  } else {
    console.log(`\nColumns for ${tableName}:`);
    console.log(data.map(row => `${row.column_name}`).join(', '));
  }
}

async function run() {
  await checkColumns('earnings');
  await checkColumns('admin_users');
  await checkColumns('ticket_messages');
  await checkColumns('bike_lock_logs');
  await checkColumns('reward_points');
  await checkColumns('subscription_billing');
}

run();
