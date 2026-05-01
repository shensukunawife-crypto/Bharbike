import supabase from "../utils/supabaseClient.js";

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

    console.log("INSERT SUCCESS:", data);
    res.json(data);
  } catch (err) {
    console.error("[addSkippedDay]", err);
    return res.status(500).json({ message: err?.message || "Insert failed" });
  }
}

export async function getSkippedDays(req, res) {
  try {
    const { data, error } = await supabase
      .from("rider_skipped_days")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json(error);
    }

    res.json(data ?? []);
  } catch (err) {
    console.error("[getSkippedDays]", err);
    return res.status(500).json({ message: err?.message || "Fetch failed" });
  }
}
