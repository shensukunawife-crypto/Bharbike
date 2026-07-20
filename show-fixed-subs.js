import supabase from "./src/utils/supabaseClient.js";

async function showFixedSubs() {
  const { data: subs, error } = await supabase
    .from("user_subscriptions")
    .select("*, users!inner(*)")
    .order("created_at", { ascending: false });

  let fetchedSubs = subs;
  if (error) {
    console.warn("Could not fetch with join, falling back to manual fetch");
    const { data: rawSubs } = await supabase
      .from("user_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    
    const { data: usersData } = await supabase.from("users").select("id, name, full_name, phone");
    const userMap = {};
    if (usersData) {
      usersData.forEach(u => userMap[u.id] = u);
    }
    
    fetchedSubs = rawSubs.map(s => ({
      ...s,
      users: userMap[s.user_id]
    }));
  }
  
  const backdated = [];
  
  for (const sub of fetchedSubs) {
    const created = new Date(sub.created_at);
    const start = new Date(sub.start_date);
    
    created.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    
    if (start.getTime() < created.getTime()) {
      const diffDays = Math.round((created - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        const { data: prevSubs } = await supabase
          .from("user_subscriptions")
          .select("end_date")
          .eq("user_id", sub.user_id)
          .lt("created_at", sub.created_at)
          .order("created_at", { ascending: false })
          .limit(1);
          
        let prevEnd = "Unknown";
        if (prevSubs && prevSubs.length > 0) {
          prevEnd = new Date(prevSubs[0].end_date).toISOString().slice(0, 10);
        }
        
        backdated.push({
          user: sub.users ? (sub.users.full_name || sub.users.name || sub.users.phone) : sub.user_id,
          phone: sub.users ? sub.users.phone : "",
          payment_date: sub.created_at.slice(0, 10),
          what_it_would_be: sub.created_at.slice(0, 10),
          fixed_start_date: sub.start_date.slice(0, 10),
          fixed_end_date: sub.end_date.slice(0, 10),
          previous_subscription_ended: prevEnd,
          days_grace_applied: diffDays
        });
      }
    }
  }
  
  console.log(JSON.stringify(backdated.slice(0, 10), null, 2));
}

showFixedSubs().then(() => process.exit(0));
