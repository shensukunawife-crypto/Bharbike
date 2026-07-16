import "dotenv/config";
import supabase from "../src/utils/supabaseClient.js";

async function main() {
  console.log("Updating trigger create_user_profile to insert into both profiles and users tables...");
  
  const sql = `
    CREATE OR REPLACE FUNCTION public.create_user_profile()
    RETURNS TRIGGER
    SECURITY DEFINER
    SET search_path = public
    LANGUAGE plpgsql
    AS $$
    BEGIN
        -- 1. Insert into profiles table
        INSERT INTO public.profiles (id, email, phone, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            NEW.phone,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. Insert into users table (to keep admin dashboard in sync)
        INSERT INTO public.users (id, full_name, email, phone, created_at, updated_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rider'),
            NEW.email,
            NEW.phone,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        RETURN NEW;
    END;
    $$;
  `;
  
  const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("❌ Failed to update trigger function:", error);
  } else {
    console.log("✅ Successfully updated trigger function:", data);
  }
  
  process.exit(0);
}

main();
