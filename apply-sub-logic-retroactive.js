import supabase from "./src/utils/supabaseClient.js";

async function applyRetroactiveSubscriptionLogic() {
  console.log("Fetching subscription plans...");
  const { data: plans } = await supabase.from("subscription_plans").select("*");
  const planMap = {};
  if (plans) {
    plans.forEach(p => {
      planMap[p.id] = p.duration_days || 7;
      planMap[p.name] = p.duration_days || 7;
    });
  }

  // legacy maps
  planMap['weekly_plan'] = 7;
  planMap['weekly'] = 7;
  planMap['monthly_plan'] = 30;
  planMap['monthly'] = 30;
  planMap['03780beb-890c-43e2-995b-076ee59ca780'] = 7;

  console.log("Fetching all subscriptions...");
  const { data: subs, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching subscriptions:", error);
    return;
  }

  const subsByUser = {};
  for (const sub of subs) {
    if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = [];
    subsByUser[sub.user_id].push(sub);
  }

  const updates = [];
  
  for (const [userId, userSubs] of Object.entries(subsByUser)) {
    let lastEndDate = null;

    for (let i = 0; i < userSubs.length; i++) {
      const sub = userSubs[i];
      let newStartDate = new Date(sub.start_date);
      let durationDays = planMap[sub.plan_id] || 7;
      
      const paidDate = new Date(sub.created_at);

      if (lastEndDate) {
        const daysSinceExpiry = (paidDate - lastEndDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceExpiry > 0 && daysSinceExpiry <= 7) {
          // Backdate to next day after previous expiry
          newStartDate = new Date(lastEndDate.getTime() + 24 * 60 * 60 * 1000);
        } else if (daysSinceExpiry <= 0) {
          // If they made a payment while they already have an active subscription
          // do NOT stack into the future. They only pay for the current week.
          // Start it from the date they paid.
          newStartDate = new Date(paidDate.getTime());
        } else {
          // Fresh start from paid date
          newStartDate = new Date(paidDate.getTime());
        }
      }

      newStartDate.setHours(0, 0, 0, 0);

      // End date is inclusive: start_date + (duration - 1)
      const newEndDate = new Date(newStartDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
      newEndDate.setHours(23, 59, 59, 999);

      const strStart = newStartDate.toISOString();
      const strEnd = newEndDate.toISOString();

      if (strStart !== sub.start_date || strEnd !== sub.end_date) {
        updates.push({
          id: sub.id,
          start_date: strStart,
          end_date: strEnd
        });
      }

      lastEndDate = newEndDate;
    }
  }

  console.log(`Found ${updates.length} subscriptions that need updating to prevent future stacking.`);
  
  if (updates.length > 0) {
    let successCount = 0;
    for (const update of updates) {
      const { error: updErr } = await supabase
        .from("user_subscriptions")
        .update({
          start_date: update.start_date,
          end_date: update.end_date,
          updated_at: new Date().toISOString()
        })
        .eq("id", update.id);
        
      if (updErr) {
        console.error(`Failed to update sub ${update.id}:`, updErr);
      } else {
        successCount++;
      }
    }
    console.log(`Successfully updated ${successCount} out of ${updates.length} subscriptions.`);
  } else {
    console.log("All subscriptions are already perfectly aligned with the logic!");
  }
}

applyRetroactiveSubscriptionLogic().then(() => {
  console.log("Done.");
  process.exit(0);
});
