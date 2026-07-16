import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: profiles, error } = await sb
    .from('profiles')
    .select('*')
    .ilike('full_name', '%vikas%');

  if (error) {
    console.error("Error fetching profile:", error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log("No user found with name 'vikas'.");
    return;
  }

  console.log(`Found ${profiles.length} user(s) named Vikas:\n`);

  for (const p of profiles) {
    console.log("-----------------------------------------");
    console.log(`👤 Name: ${p.full_name}`);
    console.log(`📞 Phone: ${p.phone || 'N/A'}`);
    console.log(`✉️ Email: ${p.email || 'N/A'}`);
    console.log(`📍 Location: ${p.location || 'N/A'}`);
    console.log(`📅 Joined: ${new Date(p.created_at).toLocaleString()}`);
    
    // Fetch latest subscription
    const { data: sub } = await sb
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      console.log(`\n💳 Subscription:`);
      console.log(`   Plan: ${sub.plan_id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Start: ${new Date(sub.start_date).toLocaleString()}`);
      console.log(`   End: ${new Date(sub.end_date).toLocaleString()}`);
    } else {
      console.log("\n💳 Subscription: None found");
    }
    
    // Fetch active rental
    const { data: rental } = await sb
      .from('rentals')
      .select('*, bikes(bike_code, name)')
      .eq('user_id', p.id)
      .in('status', ['ongoing', 'active'])
      .maybeSingle();
      
    if (rental) {
      console.log(`\n🚲 Active Rental:`);
      console.log(`   Bike: ${rental.bikes?.bike_code} (${rental.bikes?.name})`);
      console.log(`   Started: ${new Date(rental.start_time).toLocaleString()}`);
      console.log(`   Ends: ${new Date(rental.end_time).toLocaleString()}`);
    } else {
      console.log("\n🚲 Active Rental: None");
    }
  }
}

main();
