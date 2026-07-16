import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(url, serviceRoleKey);

  console.log("--- Supabase RLS and Table Details Check ---");

  try {
    // Let's run a single SELECT without a semicolon to get the RLS status
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('users', 'profiles')"
    });

    if (error) {
      console.error("RPC Error:", error);
    } else {
      console.log("pg_tables result:", data);
    }

    // Let's run a SELECT to get the policies on 'users' and 'profiles'
    const { data: polData, error: polError } = await supabase.rpc("exec_sql", {
      sql_query: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('users', 'profiles')"
    });

    if (polError) {
      console.error("Policies RPC Error:", polError);
    } else {
      console.log("pg_policies result:", polData);
    }

  } catch (err) {
    console.error("Unexpected error:", err);
  }

  process.exit(0);
}

main();
