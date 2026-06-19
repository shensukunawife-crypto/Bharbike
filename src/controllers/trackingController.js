import supabase from "../utils/supabaseClient.js";

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseLatLngFromText(text) {
  if (typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    const fromJson = extractLatLng(parsed);
    if (fromJson) return fromJson;
  } catch {
    // ignore json parse failures
  }

  const match = text.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if (!match) return null;

  const lat = toNumber(match[1]);
  const lng = toNumber(match[3]);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function extractLatLng(row) {
  if (!row || typeof row !== "object") return null;

  const pairs = [
    ["lat", "lng"],
    ["latitude", "longitude"],
    ["current_lat", "current_lng"],
    ["current_latitude", "current_longitude"],
    ["pickup_lat", "pickup_lng"],
    ["drop_lat", "drop_lng"],
  ];

  for (const [latKey, lngKey] of pairs) {
    const lat = toNumber(row[latKey]);
    const lng = toNumber(row[lngKey]);
    if (lat != null && lng != null) return { lat, lng };
  }

  if (typeof row.location === "string") {
    return parseLatLngFromText(row.location);
  }

  if (row.location && typeof row.location === "object") {
    return extractLatLng(row.location);
  }

  return null;
}

function pickFirstNumber(row, keys) {
  if (!row || typeof row !== "object") return null;
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (value != null) return value;
  }
  return null;
}

function minutesBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export async function getTracking(req, res) {
  try {
    const userId = req.params.id;

    const [profileRes, rentalRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("rentals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      return res.status(500).json({ message: "Failed to fetch profile", error: profileRes.error.message });
    }
    if (rentalRes.error) {
      return res.status(500).json({ message: "Failed to fetch tracking", error: rentalRes.error.message });
    }

    const profile = profileRes.data ?? null;
    const latestRental = rentalRes.data ?? null;

    let coords = extractLatLng(latestRental) || extractLatLng(profile);
    
    // Attempt to fetch live LocoNav coordinates if they have an active rental
    let liveSpeed = 0;
    if (latestRental && latestRental.status !== 'completed' && latestRental.bike_id) {
      try {
        const { getBikeHealth } = await import("../services/iotService.js");
        const health = await getBikeHealth(latestRental.bike_id);
        if (health && health.lat && health.lng) {
          coords = { lat: health.lat, lng: health.lng };
          liveSpeed = health.speed || 0;
        }
      } catch (iotErr) {
        console.warn("[getTracking] Failed to fetch live LocoNav location:", iotErr.message);
      }
    }

    if (!coords) {
      // Demo mode: return mock tracking data so the app doesn't error
      const mockPayload = {
        lat: 28.6139,
        lng: 77.2090,
        speed: 0,
        distance: 0,
        duration: latestRental ? minutesBetween(latestRental.started_at ?? latestRental.created_at, new Date().toISOString()) ?? 0 : 0,
        idleTime: 0,
        lastParkedLocation: null,
        updatedAt: latestRental?.updated_at ?? latestRental?.created_at ?? new Date().toISOString(),
        is_demo: true,
      };
      return res.json(mockPayload);
    }

    const duration =
      pickFirstNumber(latestRental, ["duration", "duration_min", "duration_mins", "ride_duration_min"]) ??
      minutesBetween(latestRental?.started_at ?? latestRental?.created_at, latestRental?.ended_at ?? new Date().toISOString()) ??
      0;

    const payload = {
      lat: coords.lat,
      lng: coords.lng,
      speed: liveSpeed || pickFirstNumber(latestRental, ["speed", "speed_kmh", "avg_speed", "avg_speed_kmh"]) || 0,
      distance: pickFirstNumber(latestRental, ["distance", "distance_km", "trip_distance", "km_covered"]) || 0,
      duration,
      idleTime: pickFirstNumber(latestRental, ["idle_time", "idle_time_min", "idle_min"]) || 0,
      lastParkedLocation: profile?.location || null,
      updatedAt: latestRental?.updated_at || latestRental?.created_at || null,
    };

    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ message: "Tracking fetch failed", error: err?.message || "Unknown error" });
  }
}

export async function getRouteHistory(req, res) {
  try {
    const userId = req.params.id;
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ message: "Failed to fetch route history", error: error.message });
    }

    const routes = (data ?? []).map((row, index) => {
      const from = row.start_location ?? row.pickup_location ?? row.from_location ?? "Unknown";
      const to = row.end_location ?? row.drop_location ?? row.to_location ?? "Unknown";
      const distance = pickFirstNumber(row, ["distance_km", "distance", "trip_distance", "km_covered"]) ?? 0;
      const duration =
        pickFirstNumber(row, ["duration_min", "duration", "ride_duration_min"]) ??
        minutesBetween(row.started_at ?? row.created_at, row.ended_at ?? row.updated_at) ??
        0;

      return {
        id: row.id ?? `${userId}-${index}`,
        from,
        to,
        distance,
        time: duration,
        startedAt: row.started_at ?? row.created_at ?? null,
      };
    });

    return res.json(routes);
  } catch (err) {
    return res.status(500).json({ message: "Route history fetch failed", error: err?.message || "Unknown error" });
  }
}
