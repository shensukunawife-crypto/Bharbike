import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  const sql = `
  -- Drop trigger if it already exists
  DROP TRIGGER IF EXISTS trg_sync_addresses_to_users ON public.addresses;

  -- Create trigger function
  CREATE OR REPLACE FUNCTION public.sync_addresses_to_users()
  RETURNS TRIGGER AS $$
  DECLARE
    target_user_id UUID;
    default_address RECORD;
    formatted_address TEXT;
  BEGIN
    -- Determine user_id to sync
    IF TG_OP = 'DELETE' THEN
      target_user_id := OLD.user_id;
    ELSE
      target_user_id := NEW.user_id;
    END IF;

    -- Find the default address, or fallback to the most recent address
    SELECT * INTO default_address 
    FROM public.addresses 
    WHERE user_id = target_user_id
    ORDER BY is_default DESC, created_at DESC 
    LIMIT 1;

    IF default_address.id IS NOT NULL THEN
      formatted_address := COALESCE(default_address.address_line, '') || ', ' || COALESCE(default_address.city, '') || ' - ' || COALESCE(default_address.pincode, '') || ' (' || COALESCE(default_address.name, '') || ')';
    ELSE
      formatted_address := NULL;
    END IF;

    -- Update the users table
    UPDATE public.users 
    SET address = formatted_address,
        updated_at = NOW()
    WHERE id = target_user_id;

    RETURN NULL;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Create trigger
  CREATE TRIGGER trg_sync_addresses_to_users
    AFTER INSERT OR UPDATE OR DELETE ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_addresses_to_users();
  `;

  console.log("Deploying address synchronization trigger to Supabase...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("Failed to deploy trigger:", error);
  } else {
    console.log("Trigger deployed successfully! Result:", data);
  }

  // Also backfill existing addresses to the users table
  console.log("Backfilling existing addresses to users table...");
  const backfillSql = `
    WITH latest_addresses AS (
      SELECT DISTINCT ON (user_id) 
        user_id,
        address_line,
        city,
        pincode,
        name
      FROM public.addresses
      ORDER BY user_id, is_default DESC, created_at DESC
    )
    UPDATE public.users u
    SET address = COALESCE(la.address_line, '') || ', ' || COALESCE(la.city, '') || ' - ' || COALESCE(la.pincode, '') || ' (' || COALESCE(la.name, '') || ')',
        updated_at = NOW()
    FROM latest_addresses la
    WHERE u.id = la.user_id;
  `;
  const { data: backfillData, error: backfillError } = await supabase.rpc("exec_sql", { sql_query: backfillSql });
  if (backfillError) {
    console.error("Failed to backfill existing addresses:", backfillError);
  } else {
    console.log("Backfill completed successfully! Result:", backfillData);
  }
}

main();
