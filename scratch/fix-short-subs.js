import dotenv from 'dotenv';
dotenv.config();
import sb from '../src/utils/supabaseClient.js';

async function main() {
  const { data: subs } = await sb
    .from('user_subscriptions')
    .select('id, user_id, start_date, end_date')
    .eq('status', 'active')
    .eq('plan_id', 'weekly_plan');

  if (!subs || subs.length === 0) return;

  for (const sub of subs) {
    const start = new Date(sub.start_date);
    const end = new Date(sub.end_date);
    
    // Mathematical difference in exactly 24-hour periods
    const msDiff = end.getTime() - start.getTime();
    const exactDays = msDiff / (1000 * 60 * 60 * 24);
    
    // If the diff is exactly 5.00 days (120 hours), it's short by 24 hours
    if (Math.round(exactDays) === 5) {
      const missingMs = 24 * 60 * 60 * 1000;
      const newEnd = new Date(end.getTime() + missingMs);
      
      console.log(`Fixing User ID: ${sub.user_id}`);
      console.log(`  Old End Date: ${end.toISOString()}`);
      console.log(`  New End Date: ${newEnd.toISOString()}`);
      
      // Update subscription
      await sb
        .from('user_subscriptions')
        .update({ end_date: newEnd.toISOString(), updated_at: new Date().toISOString() })
        .eq('id', sub.id);
        
      // Check if they have an active rental to update as well
      const { data: rental } = await sb
        .from('rentals')
        .select('*')
        .eq('user_id', sub.user_id)
        .in('status', ['ongoing', 'active'])
        .maybeSingle();

      if (rental) {
        // Only update rental end_time if it matches the old sub end date exactly
        if (new Date(rental.end_time).getTime() === end.getTime()) {
          await sb
            .from('rentals')
            .update({ end_time: newEnd.toISOString() })
            .eq('id', rental.id);
          console.log(`  Updated rental end time as well.`);
        }
      }
    }
  }
  console.log("Fixes complete.");
}

main();
