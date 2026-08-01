// Audit: find rentals that had end_time set (the old "extra day" assign bike bug)
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toIST(utcStr) {
  if (!utcStr) return "null";
  const d = new Date(utcStr);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function toISTDate(utcStr) {
  if (!utcStr) return "null";
  const d = new Date(utcStr);
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit"
  });
}

async function main() {
  console.log("=== Querying rentals table for admin-assigned bikes with end_time set ===\n");

  // Rentals with end_time set AND price=0 (admin assigned) 
  const { data: buggyRentals, error: err1 } = await supabase
    .from("rentals")
    .select("id, user_id, bike_id, start_time, end_time, duration, status, price, created_at")
    .not("end_time", "is", null)
    .eq("price", 0)
    .order("created_at", { ascending: false });

  if (err1) { console.error("Error:", err1); return; }

  console.log(`Found ${buggyRentals?.length ?? 0} admin-assigned rentals WITH end_time set:\n`);

  for (const r of buggyRentals ?? []) {
    const { data: user } = await supabase.from("users").select("name, phone").eq("id", r.user_id).maybeSingle();
    const { data: bike } = await supabase.from("bikes").select("bike_code").eq("id", r.bike_id).maybeSingle();
    const { data: subs } = await supabase
      .from("user_subscriptions")
      .select("plan_id, start_date, end_date, status")
      .eq("user_id", r.user_id)
      .order("end_date", { ascending: false })
      .limit(3);

    console.log(`──────────────────────────────────────────`);
    console.log(`User      : ${user?.name ?? "Unknown"} | ${user?.phone ?? "—"}`);
    console.log(`Bike      : ${bike?.bike_code ?? r.bike_id}`);
    console.log(`Status    : ${r.status}`);
    console.log(`Assigned  : ${toIST(r.created_at)} IST`);
    console.log(`Start     : ${toIST(r.start_time)} IST`);
    console.log(`End (BUG) : ${toIST(r.end_time)} IST   <-- extra day was set here`);
    console.log(`Duration  : ${r.duration ?? "null"}`);

    // Calculate what the "extra" day looks like
    if (r.start_time && r.end_time) {
      const startIST = toISTDate(r.start_time);
      const endIST   = toISTDate(r.end_time);
      console.log(`Date range: ${startIST} → ${endIST} (IST dates)`);
    }

    if (subs?.length) {
      console.log(`Subscriptions:`);
      for (const s of subs) {
        console.log(`  [${s.status}] ${s.plan_id}: ${toISTDate(s.start_date)} → ${toISTDate(s.end_date)}`);
      }
    }
    console.log();
  }

  // Also: all currently active rentals (regardless of price)
  console.log("\n=== ALL currently ACTIVE rentals ===\n");

  const { data: active, error: err2 } = await supabase
    .from("rentals")
    .select("id, user_id, bike_id, start_time, end_time, duration, status, price, created_at")
    .in("status", ["active", "ongoing"])
    .order("created_at", { ascending: false });

  if (err2) { console.error("Error:", err2); return; }

  for (const r of active ?? []) {
    const { data: user } = await supabase.from("users").select("name, phone").eq("id", r.user_id).maybeSingle();
    const { data: bike } = await supabase.from("bikes").select("bike_code").eq("id", r.bike_id).maybeSingle();
    const { data: subs } = await supabase
      .from("user_subscriptions")
      .select("plan_id, start_date, end_date, status")
      .eq("user_id", r.user_id)
      .order("end_date", { ascending: false })
      .limit(2);

    console.log(`──────────────────────────────────────────`);
    console.log(`User     : ${user?.name ?? "Unknown"} | ${user?.phone ?? "—"}`);
    console.log(`Bike     : ${bike?.bike_code ?? r.bike_id}`);
    console.log(`Status   : ${r.status} | Price: ${r.price}`);
    console.log(`Start    : ${toIST(r.start_time)} IST`);
    console.log(`End      : ${r.end_time ? toIST(r.end_time) + " IST  <-- end_time is set!" : "null (correct)"}`);
    if (subs?.length) {
      console.log(`Subs:`);
      for (const s of subs) {
        console.log(`  [${s.status}] ${s.plan_id}: ${toISTDate(s.start_date)} → ${toISTDate(s.end_date)}`);
      }
    }
    console.log();
  }
}

main().catch(console.error);
