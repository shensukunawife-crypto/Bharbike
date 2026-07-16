import supabase from '../src/utils/supabaseClient.js';

async function cleanup() {
  // Remove any garbage row inserted by fake UUID test
  const { data, error } = await supabase.from('user_subscriptions').delete().eq('user_id', 'not-a-real-uuid').select();
  console.log("Deleted garbage rows:", data?.length || 0, "Error:", error?.message || "none");
}
cleanup();
