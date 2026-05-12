import supabase from "../src/utils/supabaseClient.js";

const plans = [
  {
    name: "basic",
    display_name: "Basic Plan",
    description: "Perfect for occasional riders. Essential features included.",
    price: 199,
    duration_days: 30,
    features: JSON.stringify(["Unlock standard hubs", "2 hours free daily", "Email support"]),
    is_active: true
  },
  {
    name: "monthly_pro", 
    display_name: "Premium Plan",
    description: "Our most popular choice for regular commuters.",
    price: 499,
    duration_days: 30,
    features: JSON.stringify(["Unlock ALL hubs", "Unlimited daily rides", "Priority support", "Free maintenance"]),
    is_active: true
  },
  {
    name: "golden",
    display_name: "Golden Plan",
    description: "The ultimate BharBike experience for power users.",
    price: 999,
    duration_days: 90,
    features: JSON.stringify(["All Premium features", "Golden priority badge", "Free home delivery", "Dedicated manager"]),
    is_active: true
  }
];

async function syncPlans() {
  console.log("Deactivating old plans...");
  await supabase.from("subscription_plans").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  
  console.log("Upserting new plans...");
  for (const p of plans) {
    const { data: existing } = await supabase.from("subscription_plans").select("id").eq("name", p.name).maybeSingle();
    
    if (existing) {
      const { error } = await supabase.from("subscription_plans").update({ ...p, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) console.error("Error updating", p.name, error);
      else console.log("Updated", p.name);
    } else {
      const { error } = await supabase.from("subscription_plans").insert({ ...p, updated_at: new Date().toISOString() });
      if (error) console.error("Error inserting", p.name, error);
      else console.log("Inserted", p.name);
    }
  }
  console.log("Done.");
}

syncPlans();
