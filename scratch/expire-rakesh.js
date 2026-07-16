import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, phone')
    .ilike('full_name', '%rakesh%');

  console.log("Found profiles:", profiles);
  
  if (profiles && profiles.length > 0) {
    const targetProfile = profiles.find(p => p.full_name.toLowerCase() === 'rakesh chaurasiya') || profiles[0];
    console.log("Target profile:", targetProfile);
    
    // Fetch the latest subscription
    const { data: subscription, error: subErr } = await sb
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', targetProfile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Current subscription:", subscription);

    // Update end_date to July 10, 2026, and status to expired
    const newEndDate = "2026-07-10T23:59:59.000Z";
    const { data: updatedSub, error: updateErr } = await sb
      .from('user_subscriptions')
      .update({
        end_date: newEndDate,
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Failed to update subscription:", updateErr.message);
    } else {
      console.log("Successfully updated subscription:");
      console.log(`End Date: ${updatedSub.end_date}`);
      console.log(`Status: ${updatedSub.status}`);
    }
  }
}

main();
