import supabase from "../utils/supabaseClient.js";
import { getIdMappings } from "../admin/controllers/adminController.js";

async function findProfileByName(riderName) {
  const name = riderName.trim();

  // Step 1: Exact case-insensitive match
  const { data: exact } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", name)
    .maybeSingle();
  if (exact) return exact;

  // Step 2: Contains match (e.g. "Shubham" matches "Shubham Raj")
  const { data: contains } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${name}%`)
    .maybeSingle();
  if (contains) return contains;

  // Step 3: Word-by-word fallback — fetch all profiles, score by matching words
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name");

  if (!allProfiles || !allProfiles.length) return null;

  const inputWords = name.toLowerCase().split(/\s+/).filter(Boolean);
  let bestMatch = null;
  let bestScore = 0;

  for (const p of allProfiles) {
    if (!p.full_name) continue;
    const profileWords = p.full_name.toLowerCase().split(/\s+/).filter(Boolean);
    const matchCount = inputWords.filter(w => profileWords.includes(w)).length;
    const score = matchCount / Math.max(inputWords.length, profileWords.length);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = p;
    }
  }

  // Only accept if at least 50% of words match
  if (bestScore >= 0.5) {
    console.log(`[findProfileByName] Fuzzy matched "${name}" → "${bestMatch.full_name}" (score: ${(bestScore * 100).toFixed(0)}%)`);
    return bestMatch;
  }

  return null;
}

// Reactivate or extend a subscription directly to a target end date.
// When targetEndDate is provided (activating a skipped day), the subscription end_date
// is set to that exact date — even if the subscription was expired.
// When deactivating, recalculates from all remaining active skipped day records.
async function syncSubscriptionForSkippedDays(riderName, targetEndDate = null) {
  try {
    if (!riderName) return;

    // 1. Find profile using fuzzy name matching
    const profile = await findProfileByName(riderName);

    if (!profile) {
      console.log(`[syncSubscription] No profile found matching name: "${riderName}"`);
      return;
    }

    // 2. Fetch the user's latest subscription (active or expired)
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("id, end_date, status")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      console.log(`[syncSubscription] No subscription found for user: ${profile.id} ("${riderName}")`);
      return;
    }

    let newEnd;

    if (targetEndDate) {
      // Activating: set subscription end_date directly to the skipped day's end date
      newEnd = new Date(targetEndDate);
      // If the skipped day end date is earlier than current subscription end date, keep the current one
      const currentEnd = new Date(subscription.end_date);
      if (currentEnd > newEnd) {
        newEnd = currentEnd;
      }
    } else {
      // Deactivating/deleting: recalculate from all remaining active skipped day records
      const { data: activeRecords } = await supabase
        .from("rider_skipped_days")
        .select("skipped_end_date, days_skipped")
        .ilike("rider_name", `%${riderName.trim()}%`)
        .eq("status", "Active");

      if (activeRecords && activeRecords.length > 0) {
        // Set end_date to the latest skipped_end_date among all remaining active records
        const latestSkippedEnd = activeRecords.reduce((latest, r) => {
          const d = new Date(r.skipped_end_date);
          return d > latest ? d : latest;
        }, new Date(0));
        newEnd = latestSkippedEnd;
      } else {
        // No active skipped days left — mark subscription as expired
        newEnd = new Date(subscription.end_date);
      }
    }

    // Determine status based on new end date vs now
    const now = new Date();
    const updatedStatus = newEnd > now ? "active" : "expired";

    // 3. Update user_subscriptions
    const { error: updateErr } = await supabase
      .from("user_subscriptions")
      .update({
        end_date: newEnd.toISOString(),
        status: updatedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription.id);

    if (updateErr) {
      console.error(`[syncSubscription] Failed to update subscription:`, updateErr.message);
    } else {
      console.log(`[syncSubscription] Updated subscription for "${riderName}" (matched: "${profile.full_name}"). New status: ${updatedStatus}, New end date: ${newEnd.toISOString()}`);
    }
  } catch (err) {
    console.error("[syncSubscription] unexpected error:", err.message);
  }
}

export async function addSkippedDay(req, res) {
  try {
    const row = {
      rider_name: req.body.rider_name ?? null,
      bike_id: req.body.bike_id ?? null,
      skipped_start_date: req.body.skipped_start_date ?? null,
      skipped_end_date: req.body.skipped_end_date ?? null,
      days_skipped:
        req.body.days_skipped != null && req.body.days_skipped !== ""
          ? Number(req.body.days_skipped)
          : null,
      reason: req.body.reason ?? null,
      status: req.body.status ?? "Inactive",
    };

    const { data, error } = await supabase
      .from("rider_skipped_days")
      .insert([row])
      .select();

    if (error) {
      console.log("INSERT ERROR:", error);
      return res.status(500).json(error);
    }

    // If status is Active, set the user's subscription end_date directly to the skipped_end_date
    if (String(row.status || "").toLowerCase() === "active" && row.skipped_end_date) {
      await syncSubscriptionForSkippedDays(row.rider_name, row.skipped_end_date);
    }

    console.log("INSERT SUCCESS:", data);
    res.json(data);
  } catch (err) {
    console.error("[addSkippedDay]", err);
    return res.status(500).json({ message: err?.message || "Insert failed" });
  }
}

export async function getSkippedDays(req, res) {
  try {
    const [
      mappings,
      { data, error }
    ] = await Promise.all([
      getIdMappings(),
      supabase
        .from("rider_skipped_days")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (error) {
      return res.status(500).json(error);
    }

    const rows = (data ?? []).map(r => {
      const bikeNum = r.bike_id ? (mappings.bikeMap.get(r.bike_id) || String(r.bike_id).slice(0, 8)) : null;
      return {
        ...r,
        shortBikeId: bikeNum ? "#" + bikeNum : "—"
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("[getSkippedDays]", err);
    return res.status(500).json({ message: err?.message || "Fetch failed" });
  }
}

export async function toggleSkippedDayStatus(req, res) {
  try {
    const { id } = req.params;

    const { data: current, error: getError } = await supabase
      .from("rider_skipped_days")
      .select("rider_name, days_skipped, status, skipped_end_date")
      .eq("id", id)
      .maybeSingle();

    if (getError || !current) {
      console.log("GET ERROR:", getError);
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const currentStatus = String(current.status || "").trim();
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";

    const { data, error } = await supabase
      .from("rider_skipped_days")
      .update({ status: nextStatus })
      .eq("id", id)
      .select();

    if (error) {
      console.log("UPDATE ERROR:", error);
      return res.status(500).json(error);
    }

    if (nextStatus === "Active" && current.skipped_end_date) {
      // Activating: set subscription end_date directly to this skipped day's end date
      await syncSubscriptionForSkippedDays(current.rider_name, current.skipped_end_date);
    } else {
      // Deactivating: recalculate from remaining active skipped day records
      await syncSubscriptionForSkippedDays(current.rider_name, null);
    }

    res.json({ success: true, nextStatus, data });
  } catch (err) {
    console.error("[toggleSkippedDayStatus]", err);
    return res.status(500).json({ message: err?.message || "Toggle failed" });
  }
}

export async function deleteSkippedDay(req, res) {
  try {
    const { id } = req.params;

    // Fetch the skipped day record before deleting it
    const { data: record, error: getError } = await supabase
      .from("rider_skipped_days")
      .select("rider_name, days_skipped, status, skipped_end_date")
      .eq("id", id)
      .maybeSingle();

    if (getError || !record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const { error } = await supabase
      .from("rider_skipped_days")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE ERROR:", error);
      return res.status(500).json(error);
    }

    // If the deleted record was Active, recalculate from remaining active records
    if (String(record.status || "").toLowerCase() === "active") {
      await syncSubscriptionForSkippedDays(record.rider_name, null);
    }

    res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    console.error("[deleteSkippedDay]", err);
    return res.status(500).json({ message: err?.message || "Delete failed" });
  }
}
