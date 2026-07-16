import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Test profile update with a sample user
async function test() {
  // 1. Check profiles table columns
  const { data: profile, error: pe } = await supabase.from('profiles').select('*').limit(1).single();
  if (pe) console.log('profiles error:', pe.message);
  else console.log('profiles columns:', Object.keys(profile));

  // 2. Check users table columns  
  const { data: user, error: ue } = await supabase.from('users').select('*').limit(1).single();
  if (ue) console.log('users error:', ue.message);
  else console.log('users columns:', Object.keys(user));
  
  // 3. Check for duplicate Firebase users in profiles
  const { data: dupes } = await supabase.from('profiles').select('phone, count').not('phone', 'is', null);
  console.log('Profile count:', dupes?.length);
}
test();
