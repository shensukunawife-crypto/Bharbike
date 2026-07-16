import "dotenv/config";
import supabase from "./src/utils/supabaseClient.js";

const wipeQuery = `
  DO $$
  DECLARE
    t_name TEXT;
    tables_to_truncate TEXT[] := ARRAY[
      'earnings',
      'ticket_messages',
      'payments',
      'rider_skipped_days',
      'kyc_documents',
      'delivery_partners',
      'bookings',
      'rentals',
      'orders',
      'wallet_transactions',
      'wallet_balances',
      'notifications',
      'admin_notifications',
      'support_tickets',
      'users',
      'profiles'
    ];
  BEGIN
    -- Loop through tables and truncate in dependency order (children first)
    FOREACH t_name IN ARRAY tables_to_truncate LOOP
      IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = t_name
      ) THEN
        EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t_name);
      END IF;
    END LOOP;

    -- Delete all users in auth.users (Supabase Authentication mapping)
    DELETE FROM auth.users WHERE id IS NOT NULL;
  END;
  $$;
`;

async function main() {
  console.log("⚠️ Starting database production manual reset...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: wipeQuery });

  if (error) {
    console.error("❌ RPC Error:", error.message || error);
    process.exit(1);
  }

  if (data && typeof data === "object" && !Array.isArray(data) && data.error) {
    console.error("❌ SQL Error:", data.error);
    process.exit(1);
  }

  if (Array.isArray(data) && data.length === 1 && data[0] && data[0].error) {
    console.error("❌ SQL Error:", data[0].error);
    process.exit(1);
  }

  console.log("🎉 Database production wipe successfully executed!");
  process.exit(0);
}

main();
