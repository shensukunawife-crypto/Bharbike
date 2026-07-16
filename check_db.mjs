import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ptrazrloxvknrjjelruw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cmF6cmxveHZrbnJqamVscnV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYzNjYwMywiZXhwIjoyMDkxMjEyNjAzfQ.s_Cg96mbGEaqQ2KzCZjscY-1fBARF26qGy1I6e5fT_U";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data: bikes, error: bikesErr } = await supabase.from('bikes').select('*').limit(1);
    if (bikesErr) console.error(bikesErr);
    else console.log(bikes[0]);
  } catch (err) {
    console.error(err);
  }
}

check();
