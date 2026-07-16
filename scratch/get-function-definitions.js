import supabase from "../src/utils/supabaseClient.js";

async function run() {
  const sql = `
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND p.proname IN ('get_or_create_wallet_balance', 'add_money_to_wallet', 'deduct_money_from_wallet')
  `;

  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_query: sql
    });

    if (error) {
      console.error("❌ Failed to fetch function definitions:", error);
    } else {
      console.log("✅ Function definitions:");
      if (Array.isArray(data)) {
        data.forEach((fn) => {
          console.log(`\n--- FUNCTION: ${fn.function_name} ---`);
          console.log(fn.definition);
        });
      } else {
        console.log(data);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
