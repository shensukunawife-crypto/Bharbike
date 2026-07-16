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
  await checkColumns('promo_uses');
  await checkColumns('vehicles');
  await checkColumns('addresses');
  await checkColumns('payment_methods');
  await checkColumns('reward_transactions');
  await checkColumns('subscription_plans');
  await checkColumns('ads');
  await checkColumns('profiles');
}

run();
