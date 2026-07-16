import supabase from '../src/utils/supabaseClient.js';

async function dropConstraint() {
  console.log("Dropping UNIQUE constraint on user_subscriptions.user_id...");
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_user_id_key`
  });
  
  if (error) {
    console.error("Error dropping constraint:", error);
  } else {
    console.log("✅ Constraint dropped successfully!", data);
  }
  
  // Verify it's gone
  const { data: remaining } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT conname FROM pg_constraint WHERE conrelid = 'user_subscriptions'::regclass AND contype = 'u'`
  });
  console.log("Remaining UNIQUE constraints:", remaining);
}

dropConstraint();
