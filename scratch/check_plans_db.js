import supabase from '../src/utils/supabaseClient.js';

async function checkPlans() {
  const { data, error } = await supabase.from('subscription_plans').select('*');
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Plans in DB:");
    console.log(JSON.stringify(data, null, 2));
  }
}
checkPlans();
