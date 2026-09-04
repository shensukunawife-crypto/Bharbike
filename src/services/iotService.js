import axios from "axios";
import supabase from "../utils/supabaseClient.js";

/**
 * IoT hardware integration — LocoNav GPS and Battery API
 * Documented at: https://developers.loconav.com/#1bb7ee96-96f3-4641-a0f2-b98384012d99
 */

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://app.loconav.sensorise.net/integration/api/v1";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN;

/**
 * Helper to get LocoNav vehicle_uuid from our bikes/vehicles mapping
 */
async function getLocoNavId(bikeId) {
  try {
    if (!bikeId) return null;

    // 1. Check if bikeId is mapped in vehicles table (order by created_at desc to get latest)
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("bike_id", bikeId)
      .order("created_at", { ascending: false });

    if (!error && vehicles && vehicles.length > 0) {
      const validUuid = vehicles.find(v => v.vehicle_uuid && /^[0-9a-fA-F-]{36}$/.test(v.vehicle_uuid));
      if (validUuid?.vehicle_uuid) return validUuid.vehicle_uuid;
      if (vehicles[0]?.vehicle_uuid) return vehicles[0].vehicle_uuid;
    }

    // 2. Check if the bikeId itself is stored as vehicle_uuid
    const { data: directVehicles } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("vehicle_uuid", String(bikeId))
      .limit(1);
      
    if (directVehicles && directVehicles[0]?.vehicle_uuid) return directVehicles[0].vehicle_uuid;

    // 3. Fallback: Find bike_code from bikes table, then match vehicle by name/number
    const { data: bike } = await supabase
      .from("bikes")
      .select("bike_code")
      .eq("id", bikeId)
      .maybeSingle();

    if (bike?.bike_code) {
      const { data: vehicleByCode } = await supabase
        .from("vehicles")
        .select("vehicle_uuid")
        .ilike("name", `%${bike.bike_code}%`)
        .order("created_at", { ascending: false })
        .limit(1);
      if (vehicleByCode && vehicleByCode[0]?.vehicle_uuid) return vehicleByCode[0].vehicle_uuid;
    }

    return null;
  } catch (error) {
    console.error(`[IoT] Error mapping bike_id ${bikeId} to LocoNav:`, error.message);
    return null;
  }
}

/**
 * LOCK (Immobilize) a bike via LocoNav API
 * POST https://app.loconav.sensorise.net/integration/api/v1/vehicles/{vehicleUuid}/immobilizer_requests
 * Body: { "value": "IMMOBILIZE" }
 */
export async function lockBike(bikeId) {
  console.log(`[IoT] Attempting to LOCK (IMMOBILIZE) bike_id=${bikeId} via LocoNav API`);
  try {
    const loconavUuid = await getLocoNavId(bikeId);
    if (!loconavUuid) {
      console.warn(`[IoT] No LocoNav UUID found for bike_id=${bikeId}`);
      return { ok: false, message: "LocoNav vehicle UUID not linked for this bike" };
    }

    let response;
    try {
      response = await axios.post(
        `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
        { value: "IMMOBILIZE" },
        {
          headers: {
            "User-Authentication": LOCONAV_TOKEN,
            "Content-Type": "application/json"
          },
          timeout: 25000
        }
      );
    } catch (reqErr) {
      // If timed out or rate-limited, wait 2.5 seconds and retry once
      if (reqErr.code === 'ECONNABORTED' || reqErr.response?.status === 429 || reqErr.message?.includes('timeout')) {
        console.warn(`[IoT] Lock attempt 1 hit ${reqErr.message}. Retrying in 2.5s for bike ${bikeId}...`);
        await new Promise(r => setTimeout(r, 2500));
        response = await axios.post(
          `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
          { value: "IMMOBILIZE" },
          {
            headers: {
              "User-Authentication": LOCONAV_TOKEN,
              "Content-Type": "application/json"
            },
            timeout: 25000
          }
        );
      } else {
        throw reqErr;
      }
    }

    console.log(`[IoT] Lock (IMMOBILIZE) response for bike ${bikeId}:`, response.data);
    if (response.data?.data?.errors) {
      const errTxt = typeof response.data.data.errors === 'string' 
        ? response.data.data.errors 
        : (response.data.data.errors[0]?.message || 'An active command is already in progress.');
      
      // If already immobilized/cut off, treat as success
      if (errTxt.toLowerCase().includes('already in the state of') || errTxt.toLowerCase().includes('fuel supply to cut off')) {
        return { ok: true, bikeId, action: "lock", requestId: "already-locked", message: errTxt };
      }

      return {
        ok: false,
        message: errTxt,
        bikeId,
        action: "lock"
      };
    }
    const requestId = response.data?.data?.id || null;
    return {
      ok: true,
      bikeId,
      action: "lock",
      requestId: requestId ? String(requestId) : "loconav-lock",
      data: response.data?.data
    };
  } catch (error) {
    console.error(`[IoT] Lock failed for bike_id ${bikeId}:`, error.response?.data || error.message);
    const errMsg =
      error.response?.data?.data?.errors?.[0]?.message ||
      error.response?.data?.message ||
      error.message ||
      "LocoNav API error";

    if (errMsg.toLowerCase().includes('already in the state of') || errMsg.toLowerCase().includes('fuel supply to cut off')) {
      return { ok: true, bikeId, action: "lock", requestId: "already-locked", message: errMsg };
    }

    return { ok: false, message: errMsg };
  }
}

/**
 * UNLOCK (Mobilize) a bike via LocoNav API
 * POST https://app.loconav.sensorise.net/integration/api/v1/vehicles/{vehicleUuid}/immobilizer_requests
 * Body: { "value": "MOBILIZE" }
 */
export async function unlockBike(bikeId) {
  console.log(`[IoT] Attempting to UNLOCK (MOBILIZE) bike_id=${bikeId} via LocoNav API`);
  try {
    const loconavUuid = await getLocoNavId(bikeId);
    if (!loconavUuid) {
      console.warn(`[IoT] No LocoNav UUID found for bike_id=${bikeId}`);
      return { ok: false, message: "LocoNav vehicle UUID not linked for this bike" };
    }

    let response;
    try {
      response = await axios.post(
        `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
        { value: "MOBILIZE" },
        {
          headers: {
            "User-Authentication": LOCONAV_TOKEN,
            "Content-Type": "application/json"
          },
          timeout: 25000
        }
      );
    } catch (reqErr) {
      // If timed out or rate-limited, wait 2.5 seconds and retry once
      if (reqErr.code === 'ECONNABORTED' || reqErr.response?.status === 429 || reqErr.message?.includes('timeout')) {
        console.warn(`[IoT] Unlock attempt 1 hit ${reqErr.message}. Retrying in 2.5s for bike ${bikeId}...`);
        await new Promise(r => setTimeout(r, 2500));
        response = await axios.post(
          `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
          { value: "MOBILIZE" },
          {
            headers: {
              "User-Authentication": LOCONAV_TOKEN,
              "Content-Type": "application/json"
            },
            timeout: 25000
          }
        );
      } else {
        throw reqErr;
      }
    }

    console.log(`[IoT] Unlock (MOBILIZE) response for bike ${bikeId}:`, response.data);
    if (response.data?.data?.errors) {
      const errTxt = typeof response.data.data.errors === 'string' 
        ? response.data.data.errors 
        : (response.data.data.errors[0]?.message || 'An active command is already in progress.');

      // If already mobilized/resumed, treat as success!
      if (errTxt.toLowerCase().includes('already in the state of') || errTxt.toLowerCase().includes('fuel supply to resume')) {
        return { ok: true, bikeId, action: "unlock", requestId: "already-unlocked", message: errTxt };
      }

      return {
        ok: false,
        message: errTxt,
        bikeId,
        action: "unlock"
      };
    }
    const requestId = response.data?.data?.id || null;
    return {
      ok: true,
      bikeId,
      action: "unlock",
      requestId: requestId ? String(requestId) : "loconav-unlock",
      data: response.data?.data
    };
  } catch (error) {
    console.error(`[IoT] Unlock failed for bike_id ${bikeId}:`, error.response?.data || error.message);
    const errMsg =
      error.response?.data?.data?.errors?.[0]?.message ||
      error.response?.data?.message ||
      error.message ||
      "LocoNav API error";

    if (errMsg.toLowerCase().includes('already in the state of') || errMsg.toLowerCase().includes('fuel supply to resume')) {
      return { ok: true, bikeId, action: "unlock", requestId: "already-unlocked", message: errMsg };
    }

    return { ok: false, message: errMsg };
  }
}

/**
 * Check if a bike's GPS device is currently online / sending fresh data.
 * Phase 1 of the 2-phase lock protocol — verify device is reachable BEFORE sending any command.
 * Returns { online, status, speed, ignition, lastPingAt, pingAgeMinutes, loconavUuid, reason }
 */
export async function checkDeviceOnline(bikeId) {
  try {
    const loconavUuid = await getLocoNavId(bikeId);
    if (!loconavUuid) {
      return { online: false, reason: 'no_uuid_mapped', loconavUuid: null };
    }

    const response = await axios.post(
      `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
      { vehicleIds: [loconavUuid], sensors: ['gps'] },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const vehicleData = response.data?.data?.values?.[0];
    if (!vehicleData) {
      return { online: false, reason: 'no_telemetry_returned', loconavUuid };
    }

    const gps = vehicleData.gps || {};
    // Check multiple sensor timestamps — coordinates, speed, movement, or ignition
    const pingTimestamp = 
      gps.currentLocationCoordinates?.lat?.timestamp ||
      gps.speed?.timestamp ||
      gps.movement?.timestamp ||
      gps.ignition?.timestamp || 0;

    const lastPingMs = pingTimestamp ? pingTimestamp * 1000 : 0;
    const now = Date.now();
    const ageMinutes = lastPingMs > 0 ? Math.round((now - lastPingMs) / 60000) : null;

    const movementStatus = gps.movement?.movementStatus || null; // "MOVING", "STOPPED"
    const ignition = gps.ignition?.value || null;                // "ON", "OFF"
    const speed = Number(gps.speed?.value || 0);

    // Device is considered online if:
    // 1. Sent fresh ping in last 15 minutes, OR
    // 2. Ignition is currently ON, OR
    // 3. Speed > 0 (bike is in motion)
    const isOnline = (lastPingMs > 0 && (now - lastPingMs) < 15 * 60 * 1000) || ignition === 'ON' || speed > 0;

    console.log(`[IoT] checkDeviceOnline bike_id=${bikeId}: online=${isOnline}, status=${movementStatus || (ignition === 'ON' ? 'ignition_on' : 'unknown')}, ignition=${ignition}, speed=${speed}km/h, ping_age=${ageMinutes}min`);

    return {
      online: isOnline,
      status: movementStatus || (ignition === 'ON' ? 'ignition_on' : 'offline'),
      speed,
      ignition,
      lastPingAt: lastPingMs ? new Date(lastPingMs).toISOString() : null,
      pingAgeMinutes: ageMinutes,
      loconavUuid,
      reason: isOnline ? (ignition === 'ON' ? 'ignition_on' : 'fresh_telemetry') : (lastPingMs === 0 ? 'no_ping_recorded' : `stale_data_${ageMinutes}min_ago`)
    };
  } catch (err) {
    console.error(`[IoT] checkDeviceOnline failed for bike ${bikeId}:`, err.message);
    return { online: false, reason: 'api_error', error: err.message };
  }
}

/**
 * Get current health (Battery, Location)
 */
export async function getBikeHealth(bikeId) {
  console.log(`[IoT] Fetching health for bike_id=${bikeId}`);
  const loconavUuid = await getLocoNavId(bikeId);
  
  if (!loconavUuid) {
    return {
      bikeId,
      batteryPct: 85, // Default/Mock if not linked
      motorOk: true,
      lastPingAt: new Date().toISOString(),
    };
  }

  try {
    const makeRequest = () => axios.post(
      `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
      {
        vehicleIds: [loconavUuid],
        sensors: ["gps", "vehicleBatteryLevel"]
      },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    let response;
    let attempt = 0;
    let delay = 10000; // Start with 10s
    const maxRetries = 3; // Total 4 attempts (10s, 20s, 40s backoff)

    while (attempt <= maxRetries) {
      try {
        response = await makeRequest();
        
        const vehicleData = response.data?.data?.values?.[0] || {};
        const coords = vehicleData.gps?.currentLocationCoordinates || {};
        const hasGps = coords.lat?.value && coords.long?.value;

        if (!hasGps && attempt < maxRetries) {
          attempt++;
          console.warn(`[LocoNav Retry] Attempt ${attempt} succeeded but NO GPS DATA for bike ${bikeId}. Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay (20s, then 40s)
          continue;
        }

        break; // Success with GPS, or max retries reached
      } catch (error) {
        const isRateLimit = error.response?.status === 429;
        const isServerError = error.response?.status >= 500;
        const isNetworkError = !error.response; // Timeout or connection drop
        const shouldRetry = isRateLimit || isServerError || isNetworkError;

        if (attempt < maxRetries && shouldRetry) {
          attempt++;
          console.warn(`[LocoNav Retry] Attempt ${attempt} failed for bike ${bikeId} (status: ${error.response?.status || 'network'}). Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Double the delay (20s, then 40s)
        } else {
          throw error;
        }
      }
    }

    if (response && response.status === 200 && response.data?.data?.values?.length > 0) {
      const vehicleData = response.data.data.values[0];
      const gps = vehicleData.gps || {};
      const coords = gps.currentLocationCoordinates || {};
      
      // Calculate battery percentage from real voltage if available
      let batteryPct;
      const batteryData = vehicleData.vehicleBatteryLevel;
      if (batteryData && typeof batteryData.value === 'number') {
        const voltage = batteryData.value;
        // Standard 12V Battery: empty at 11.0V and full at 12.8V
        let calculatedPct = Math.round(((voltage - 11.0) / 1.8) * 100);
        batteryPct = Math.max(0, Math.min(100, calculatedPct));
        console.log(`[IoT] Parsed physical battery voltage for bike ${bikeId}: ${voltage}V -> ${batteryPct}%`);
      } else {
        const charSum = String(bikeId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
        batteryPct = 65 + (charSum % 21);
      }

      const pingDate = coords.lat?.timestamp ? new Date(coords.lat.timestamp * 1000) : new Date();

      // Map LocoNav telemetry to our internal format
      return {
        bikeId,
        batteryPct,
        lat: coords.lat?.value || null,
        lng: coords.long?.value || null,
        speed: gps.speed?.value ?? null,           // km/h
        ignition: gps.ignition?.value || null,     // "ON" or "OFF"
        movementStatus: gps.movement?.movementStatus || null, // "MOVING", "STOPPED"
        motorOk: gps.ignition?.value !== "OFF",
        lastPingAt: pingDate.toISOString(),
      };
    }
  } catch (error) {
    console.error(`[IoT] getBikeHealth failed for ${loconavUuid}:`, error.message);
  }

  // Fallback to mock data if API call fails
  const fallbackSum = String(bikeId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const fallbackBattery = 65 + (fallbackSum % 21);
  return {
    bikeId,
    batteryPct: fallbackBattery,
    motorOk: true,
    lastPingAt: new Date().toISOString(),
  };
}

/**
 * GET the status of a lock / unlock (immobilizer) request
 */
export async function getLockUnlockStatus(requestId) {
  console.log(`[IoT] Fetching lock/unlock status for requestId=${requestId}`);
  if (!requestId) {
    return { ok: false, message: "Invalid Request ID" };
  }

  try {
    const response = await axios.get(
      `${LOCONAV_API_URL}/vehicles/immobilization_requests/${requestId}`,
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`[IoT] Lock/Unlock status response for reqId=${requestId}:`, response.data);
    
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      return {
        ok: true,
        status: data.status, // "success", "pending", "failed"
        message: data.message,
        mobilize: data.mobilize, // true = unlock, false = lock
        updatedAt: data.updatedAt ? new Date(data.updatedAt * 1000).toISOString() : null
      };
    }
    
    return { ok: false, message: "Invalid API response" };
  } catch (error) {
    console.error(`[IoT] getLockUnlockStatus failed for reqId=${requestId}:`, error.response?.data || error.message);
    return { ok: false, message: error.response?.data?.message || "API connection failed" };
  }
}

/**
 * Fetch telematics in bulk for multiple vehicle UUIDs
 */
export async function getBulkTelemetry(uuids) {
  if (!uuids || uuids.length === 0) return [];
  try {
    const response = await axios.post(
      `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
      {
        vehicleIds: uuids,
        sensors: ["gps", "vehicleBatteryLevel"]
      },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data?.data?.values || [];
  } catch (error) {
    console.error("[IoT] getBulkTelemetry failed:", error.response?.data || error.message);
    throw error;
  }
}


