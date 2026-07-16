import supabase from './src/utils/supabaseClient.js';

async function checkLogs() {
  const { data, error } = await supabase
    .from('brain_activity_logs')
    .select('*')
    .eq('action', 'SWEEP')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.log("Sweep Logs:");
    console.log(data);
  }
}

checkLogs();
