import supabase from "../utils/supabaseClient.js";

/**
 * Handles incoming webhooks from LocoNav or external IoT gateways.
 * Captures real-time immobilization & mobilization events (including manual web dashboard clicks).
 */
export async function handleLoconavWebhook(req, res) {
  try {
    const payload = req.body || {};
    console.log("[IoT Webhook] Received incoming LocoNav webhook:", JSON.stringify(payload));

    const event = payload.event || payload.action_type || "immobilizer_event";
    const data = payload.data || payload.vehicle || payload;

    const vehicleUuid = data.vehicle_uuid || data.vehicleUuid || data.uuid || payload.vehicle_uuid || null;
    const vehicleNumber = data.vehicle_number || data.vehicleNumber || data.displayNumber || data.number || payload.vehicle_number || null;
    const requestId = data.id || data.request_id || payload.request_id || null;
    const status = (data.status || payload.status || "success").toLowerCase();
    const isMobilize = data.mobilize === true || data.value === "MOBILIZE" || data.action === "unlock" || payload.mobilize === true;
    const message = data.message || payload.message || (isMobilize ? "Vehicle Mobilized (Unlocked)" : "Vehicle Immobilized (Locked)");
    const creatorEmail = data.creator_email || data.creatorEmail || payload.creator_email || "loconav_portal";
    const creatorType = data.creator_type || data.creatorType || payload.creator_type || "Web User";

    // 1. Find the bike in our database
    let bike = null;
    if (vehicleUuid) {
      const { data: v } = await supabase.from("vehicles").select("bike_id, bikes(*)").eq("vehicle_uuid", vehicleUuid).maybeSingle();
      if (v?.bikes) bike = v.bikes;
    }
    
    if (!bike && vehicleNumber) {
      const { data: b } = await supabase.from("bikes").select("*").ilike("bike_code", `%${vehicleNumber}%`).maybeSingle();
      if (b) bike = b;
    }

    if (!bike) {
      console.warn("[IoT Webhook] Could not match vehicle to bike in database. Payload:", { vehicleUuid, vehicleNumber });
      return res.status(200).json({ success: true, warning: "Vehicle received but not mapped to bike ID" });
    }

    const action = isMobilize ? "unlock" : "lock";
    const isSuccess = status === "success" || status === "completed" || status === "ok";

    // Find the latest rental or fallback user
    const { data: activeRental } = await supabase
      .from("rentals")
      .select("user_id")
      .eq("bike_id", bike.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let userId = activeRental?.user_id || null;
    if (!userId) {
      // Fallback to first system user to satisfy not-null constraint
      const { data: anyUser } = await supabase.from("users").select("id").limit(1).single();
      userId = anyUser?.id;
    }

    // 2. Insert into bike_lock_logs
    const isPortalManual = creatorType.toLowerCase() === "user" || creatorEmail.includes("@") || !payload.triggered_by;
    const triggerSource = isPortalManual ? "loconav_portal_manual_click" : (payload.triggered_by || "webhook_sync");

    if (userId) {
      const { error: logErr } = await supabase.from("bike_lock_logs").insert([{
        bike_id: bike.id,
        user_id: userId,
        action: action,
        method: "app",
        success: isSuccess,
        metadata: {
          triggered_by: triggerSource,
          source: "loconav_portal_webhook",
          status_reason: isMobilize ? "external_portal_mobilize" : "external_portal_immobilize",
          iot_request_id: requestId ? String(requestId) : null,
          creator_email: creatorEmail,
          creator_type: creatorType,
          loconav_message: message,
          raw_payload: payload
        },
        error_message: isSuccess ? null : message
      }]);

      if (logErr) console.warn("[IoT Webhook] Error inserting lock log:", logErr.message);
    }

    // 3. Update bike is_locked state in bikes table
    if (isSuccess) {
      await supabase
        .from("bikes")
        .update({
          is_locked: !isMobilize,
          last_lock_request_id: requestId ? String(requestId) : undefined,
          last_ping_at: new Date().toISOString()
        })
        .eq("id", bike.id);
    }

    console.log(`[IoT Webhook] ✅ Processed ${action.toUpperCase()} on Bike ${bike.bike_code} (Source: ${triggerSource} | Req #${requestId})`);

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${action} on ${bike.bike_code}`,
      bike_code: bike.bike_code,
      action,
      is_locked: !isMobilize
    });
  } catch (err) {
    console.error("[IoT Webhook] Exception processing webhook:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
