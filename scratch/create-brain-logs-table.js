import supabase from '../src/utils/supabaseClient.js';

async function createBrainLogsTable() {
  console.log("Creating brain_activity_logs table...");
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS brain_activity_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT,
        payment_amount NUMERIC,
        action TEXT NOT NULL,
        reason TEXT,
        old_status TEXT,
        new_status TEXT,
        old_end_date TIMESTAMPTZ,
        new_end_date TIMESTAMPTZ,
        plan_id TEXT,
        backdated BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS brain_logs_created_at ON brain_activity_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS brain_logs_user_id ON brain_activity_logs(user_id);
    `
  });
  if (error) {
    console.error("Error creating table:", error);
  } else {
    console.log("✅ brain_activity_logs table created:", data);
  }
}

createBrainLogsTable();
