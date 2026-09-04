import supabase from "../../utils/supabaseClient.js";
import * as iot from "../../services/iotService.js";
import axios from "axios";
import { renderPage } from "./adminController.js";

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://app.loconav.sensorise.net/integration/api/v1";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || "ZBC5heBXfKDx8qcGWcjy";

// In-memory address cache to prevent repetitive reverse-geocoding
const addressCache = new Map();

async function getQuickAddress(lat, lon) {
  if (!lat || !lon) return "Location unavailable";
  const key = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key);

  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: { "User-Agent": "BharBike-Operations/1.0 (fleet@bharbike.com)" },
        timeout: 2500
      }
    );
    const addr = res.data?.display_name || `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
    addressCache.set(key, addr);
    // Keep cache capped
    if (addressCache.size > 200) {
      const firstKey = addressCache.keys().next().value;
      addressCache.delete(firstKey);
    }
    return addr;
  } catch {
    return `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)} (Thane Region)`;
  }
}

/**
 * GET /admin/live-tracking
 * Renders the main Live Tracking & Telematics page
 */
export async function liveTrackingPage(req, res) {
  try {
    // 1. Fetch all bikes
    const { data: bikes, error: bErr } = await supabase
      .from("bikes")
      .select("id, bike_code, name, status, is_locked, battery, last_lat, last_lng, last_ping_at")
      .order("bike_code", { ascending: true });

    if (bErr) throw bErr;

    // 2. Fetch all linked vehicles (GPS Trackers)
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("bike_id, vehicle_uuid, vehicle_number, name");

    const vehicleMap = {};
    (vehicles || []).forEach(v => {
      if (v.bike_id) vehicleMap[v.bike_id] = v;
    });

    // 3. Fetch recent ongoing/active/expired rentals
    const { data: rentals } = await supabase
      .from("rentals")
      .select("id, bike_id, user_id, status, end_time, created_at")
      .in("status", ["ongoing", "active", "expired"])
      .order("created_at", { ascending: false });

    // 4. Fetch users for active rentals
    const userIds = [...new Set((rentals || []).map(r => r.user_id).filter(Boolean))];
    const userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, name, phone, email")
        .in("id", userIds);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }

    // Map each bike to its most recent rental & rider
    const latestRentalByBike = {};
    (rentals || []).forEach(r => {
      if (r.bike_id && !latestRentalByBike[r.bike_id]) {
        latestRentalByBike[r.bike_id] = r;
      }
    });

    const bikesList = (bikes || []).map(b => {
      const v = vehicleMap[b.id] || null;
      const r = latestRentalByBike[b.id] || null;
      const u = r ? userMap[r.user_id] : null;

      return {
        id: b.id,
        bike_code: b.bike_code || `Bike #${b.id}`,
        name: b.name || b.bike_code,
        status: b.status || "available",
        is_locked: b.is_locked === true,
        battery: b.battery != null ? Number(b.battery) : 0,
        hasGps: !!v?.vehicle_uuid,
        vehicleUuid: v?.vehicle_uuid || null,
        vehicleNumber: v?.vehicle_number || null,
        riderName: u ? (u.full_name || u.name || "Assigned Rider") : null,
        riderPhone: u?.phone || null,
        rentalStatus: r?.status || null,
        rentalEndTime: r?.end_time || null
      };
    });

    // Determine default selected bike (query param or TNA027 or first bike with GPS)
    let selectedBikeId = req.query.bikeId || null;
    if (!selectedBikeId) {
      const defaultBike = bikesList.find(b => b.bike_code === "TNA027") || bikesList.find(b => b.hasGps) || bikesList[0];
      selectedBikeId = defaultBike?.id || null;
    }

    return renderPage(res, {
      title: "Live Tracking & Telematics",
      active: "live-tracking",
      bodyView: "live-tracking",
      bikesList,
      selectedBikeId
    });
  } catch (err) {
    console.error("[liveTracking.liveTrackingPage] error:", err);
    return res.status(500).send("Failed to load Live Tracking: " + err.message);
  }
}

/**
 * GET /admin/api/telematics/:bikeId/live
 * Fetches real-time sensor telemetry directly from LocoNav for the selected bike
 */
export async function getLiveBikeTelematics(req, res) {
  try {
    const { bikeId } = req.params;
    if (!bikeId) {
      return res.status(400).json({ success: false, message: "bikeId is required" });
    }

    // 1. Resolve bike
    let query = supabase.from("bikes").select("*");
    if (!isNaN(bikeId)) {
      query = query.eq("id", Number(bikeId));
    } else {
      query = query.ilike("bike_code", bikeId.trim());
    }
    const { data: bike, error: bErr } = await query.maybeSingle();
    if (bErr || !bike) {
      return res.status(404).json({ success: false, message: "Bike not found" });
    }

    // 2. Fetch vehicle tracker UUID
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("bike_id", bike.id)
      .maybeSingle();

    if (!vehicle || !vehicle.vehicle_uuid) {
      return res.json({
        success: true,
        bike: {
          id: bike.id,
          bike_code: bike.bike_code,
          is_locked: bike.is_locked,
          status: bike.status,
          battery: bike.battery
        },
        hasGps: false,
        message: "No GPS tracker hardware linked for this bike in database."
      });
    }

    // 3. Fetch latest rental & rider details
    const { data: rental } = await supabase
      .from("rentals")
      .select("id, user_id, status, start_time, end_time, created_at")
      .eq("bike_id", bike.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let rider = null;
    let subscription = null;
    if (rental?.user_id) {
      const [uRes, sRes] = await Promise.all([
        supabase.from("users").select("id, full_name, name, phone, email, location").eq("id", rental.user_id).maybeSingle(),
        supabase.from("user_subscriptions").select("*").eq("user_id", rental.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]);
      const u = uRes.data;
      if (u) {
        rider = {
          id: u.id,
          name: u.full_name || u.name || "Unknown",
          phone: u.phone || "N/A",
          email: u.email || "N/A",
          location: u.location || "N/A",
          rentalStatus: rental.status,
          rentalEndTime: rental.end_time
        };
      }
      subscription = sRes.data || null;
    }

    // 4. Fetch recent lock logs for this bike (last 5 events)
    const { data: recentLogs } = await supabase
      .from("bike_lock_logs")
      .select("id, action, success, error_message, metadata, created_at")
      .eq("bike_id", bike.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const formattedLogs = (recentLogs || []).map(l => ({
      id: l.id,
      action: l.action.toUpperCase(),
      success: l.success,
      reqId: l.metadata?.iot_request_id || null,
      trigger: l.metadata?.triggered_by || "system",
      error: l.error_message || null,
      timeIST: new Date(l.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      })
    }));

    // 5. Query live telematics from LocoNav
    let telemetry = null;
    let address = "Location coordinates not available";

    try {
      const lRes = await axios.post(
        `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
        { vehicleIds: [vehicle.vehicle_uuid], sensors: ["gps"] },
        {
          headers: {
            "User-Authentication": LOCONAV_TOKEN,
            "Content-Type": "application/json"
          },
          timeout: 12000
        }
      );

      const val = lRes.data?.data?.values?.[0];
      if (val && val.gps) {
        const gps = val.gps;
        const lat = gps.currentLocationCoordinates?.lat?.value || null;
        const lon = gps.currentLocationCoordinates?.long?.value || null;
        const speedVal = gps.speed?.value != null ? Number(gps.speed.value) : 0;
        const ignitionVal = String(gps.ignition?.value || "OFF").toUpperCase();
        const movementStatus = gps.movement?.movementStatus || (speedVal > 0 ? "MOVING" : "STOPPED");

        const rawTimestamp = gps.speed?.timestamp || gps.currentLocationCoordinates?.lat?.timestamp || Date.now() / 1000;
        const pingDate = new Date(rawTimestamp * 1000);
        const ageSeconds = Math.max(0, Math.floor((Date.now() - pingDate.getTime()) / 1000));
        const ageMinutes = Math.floor(ageSeconds / 60);

        let ageText = "Just now";
        if (ageSeconds < 60) ageText = `${ageSeconds}s ago`;
        else if (ageMinutes < 60) ageText = `${ageMinutes}m ago`;
        else ageText = `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m ago`;

        telemetry = {
          lat,
          lon,
          speed: speedVal,
          speedUnit: gps.speed?.unit || "km/h",
          ignition: ignitionVal,
          movementStatus,
          orientation: gps.orientation?.value || 0,
          pingTimestamp: pingDate.toISOString(),
          pingAgeText: ageText,
          pingAgeMinutes: ageMinutes,
          timeIST: pingDate.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
          })
        };

        if (lat && lon) {
          address = await getQuickAddress(lat, lon);
        }
      }
    } catch (telematicsErr) {
      console.warn(`[liveTracking] Telematics fetch failed for ${bike.bike_code}:`, telematicsErr.response?.data || telematicsErr.message);
    }

    return res.json({
      success: true,
      hasGps: true,
      bike: {
        id: bike.id,
        bike_code: bike.bike_code,
        name: bike.name,
        is_locked: bike.is_locked === true,
        status: bike.status,
        battery: bike.battery
      },
      vehicle: {
        uuid: vehicle.vehicle_uuid,
        number: vehicle.vehicle_number,
        name: vehicle.name
      },
      rider,
      subscription: subscription ? {
        status: subscription.status,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        isExpired: subscription.status === "expired" || (subscription.end_date && new Date(subscription.end_date) < new Date())
      } : null,
      telemetry,
      address,
      recentLogs: formattedLogs
    });
  } catch (error) {
    console.error("[liveTracking.getLiveBikeTelematics] error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch live telematics" });
  }
}

/**
 * POST /admin/api/telematics/:bikeId/control
 * Direct 1-click lock or unlock from the Live Tracking view
 */
export async function remoteControlBike(req, res) {
  try {
    const { bikeId } = req.params;
    const { action } = req.body; // 'lock' or 'unlock'

    if (!action || !["lock", "unlock"].includes(action)) {
      return res.status(400).json({ success: false, message: "Valid action ('lock' or 'unlock') is required" });
    }

    // Resolve bike
    let query = supabase.from("bikes").select("id, bike_code, is_locked");
    if (!isNaN(bikeId)) query = query.eq("id", Number(bikeId));
    else query = query.ilike("bike_code", bikeId.trim());

    const { data: bike } = await query.maybeSingle();
    if (!bike) return res.status(404).json({ success: false, message: "Bike not found" });

    // Fetch user for log
    const { data: rental } = await supabase
      .from("rentals")
      .select("user_id")
      .eq("bike_id", bike.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (action === "lock") {
      result = await iot.lockBike(bike.id);
      if (result && result.ok !== false) {
        await supabase.from("bikes").update({ is_locked: true }).eq("id", bike.id);
      }
    } else {
      result = await iot.unlockBike(bike.id);
      if (result && result.ok !== false) {
        await supabase.from("bikes").update({ is_locked: false }).eq("id", bike.id);
      }
    }

    const isSuccess = result?.ok !== false;

    // Log the manual action
    await supabase.from("bike_lock_logs").insert([{
      bike_id: bike.id,
      user_id: rental?.user_id || null,
      action,
      method: "admin",
      success: isSuccess,
      error_message: isSuccess ? null : (result?.message || "Command failed"),
      metadata: {
        triggered_by: "live_tracking_panel",
        iot_request_id: result?.requestId || null,
        note: `Manual 1-click ${action} executed from Live Tracking dashboard.`
      }
    }]);

    return res.json({
      success: isSuccess,
      action,
      requestId: result?.requestId || null,
      message: isSuccess
        ? `Successfully sent ${action.toUpperCase()} command! (LocoNav Req #${result?.requestId || "confirmed"})`
        : (result?.message || `Failed to execute ${action}`)
    });
  } catch (err) {
    console.error("[liveTracking.remoteControlBike] error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to control vehicle" });
  }
}
