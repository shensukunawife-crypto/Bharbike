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

export async function toggleSkippedDayStatus(req, res) {
  try {
    const { id } = req.params;

    const { data: current, error: getError } = await supabase
      .from("rider_skipped_days")
      .select("status")
      .eq("id", id)
      .single();

    if (getError || !current) {
      console.log("GET ERROR:", getError);
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const currentStatus = String(current.status || "").trim();
    let nextStatus = "Active";
    if (currentStatus === "Active") {
      nextStatus = "Inactive";
    } else {
      nextStatus = "Active";
    }

    const { data, error } = await supabase
      .from("rider_skipped_days")
      .update({ status: nextStatus })
      .eq("id", id)
      .select();

    if (error) {
      console.log("UPDATE ERROR:", error);
      return res.status(500).json(error);
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
    const { error } = await supabase
      .from("rider_skipped_days")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE ERROR:", error);
      return res.status(500).json(error);
    }

    res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    console.error("[deleteSkippedDay]", err);
    return res.status(500).json({ message: err?.message || "Delete failed" });
  }
}
