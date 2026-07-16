import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("--- Fetching Functions from public Schema ---");
  const { data: routines, error: err } = await supabase
    .from("pg_catalog.pg_proc")
    .select(`
      proname,
      proargtypes,
      proargnames
    `)
    .ilike("proname", "%wallet%");
  
  if (err) {
    console.error("Error fetching routines:", err.message);
    return;
  }

  console.log("Found routines:");
  routines.forEach(r => {
    console.log(`- Function Name: ${r.proname}`);
    console.log(`  Arg Names: ${r.proargnames}`);
    console.log(`  Arg Types: ${r.proargtypes}`);
  });
}
run();
