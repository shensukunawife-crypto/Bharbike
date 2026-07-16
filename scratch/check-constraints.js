import supabase from '../src/utils/supabaseClient.js';

async function checkConstraints() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT conname, contype, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'user_subscriptions'::regclass ORDER BY contype`
  });
  console.log("Raw result:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

checkConstraints();
