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
    // Check if bikeId is already a UUID (from bikes table) or we need to find the mapping
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("bike_id", bikeId)
      .maybeSingle();

    if (error) throw error;
    
    // If found in mapping, return the LocoNav UUID
    if (vehicle?.vehicle_uuid) return vehicle.vehicle_uuid;

    // Fallback: Check if the bikeId itself is stored in vehicle_uuid (rare but possible during migration)
    const { data: directVehicle } = await supabase
      .from("vehicles")
      .select("vehicle_uuid")
      .eq("vehicle_uuid", bikeId)
      .maybeSingle();
      
    if (directVehicle?.vehicle_uuid) return directVehicle.vehicle_uuid;

    return null;
  } catch (error) {
    console.error(`[IoT] Error mapping bike_id ${bikeId} to LocoNav:`, error.message);
    return null;
  }
}

const SELF_HOSTED_IOT_URL = process.env.SELF_HOSTED_IOT_URL || "https://iotserver-33zq.onrender.com";

/**
 * LOCK (Immobilize) a bike
 */
export async function lockBike(bikeId) {
  console.log(`[IoT] Attempting to LOCK bike_id=${bikeId} via Self-Hosted Server`);
  try {
    const loconavUuid = await getLocoNavId(bikeId);
    const response = await axios.post(
      `${SELF_HOSTED_IOT_URL}/api/lock`,
      { bikeId, imei: loconavUuid || null },
      { timeout: 10000 }
    );

    console.log(`[IoT] Lock response from Self-Hosted Server:`, response.data);
    return { ok: true, bikeId, action: "lock", requestId: response.data?.requestId || "self-hosted-lock" };
  } catch (error) {
    console.error(`[IoT] Lock failed for bike_id ${bikeId}:`, error.response?.data || error.message);
    return { ok: false, message: error.response?.data?.error || error.message || "IoT server error" };
  }
}

/**
 * UNLOCK (Mobilize) a bike
 */
export async function unlockBike(bikeId) {
  console.log(`[IoT] Attempting to UNLOCK bike_id=${bikeId} via Self-Hosted Server`);
  try {
    const loconavUuid = await getLocoNavId(bikeId);
    const response = await axios.post(
      `${SELF_HOSTED_IOT_URL}/api/unlock`,
      { bikeId, imei: loconavUuid || null },
      { timeout: 10000 }
    );

    console.log(`[IoT] Unlock response from Self-Hosted Server:`, response.data);
    return { ok: true, bikeId, action: "unlock", requestId: response.data?.requestId || "self-hosted-unlock" };
  } catch (error) {
    console.error(`[IoT] Unlock failed for bike_id ${bikeId}:`, error.response?.data || error.message);
    return { ok: false, message: error.response?.data?.error || error.message || "IoT server error" };
  }
}


/**
 * Get current health (Battery, Location)
 */
export async function getBikeHealth(bikeId) {
  console.log(`[IoT] Fetching live health & GPS telemetry for bike_id=${bikeId}`);
  try {
    const { data: bike } = await supabase
      .from('bikes')
      .select('id, battery, last_lat, last_lng, location, is_locked, last_ping_at, last_gps_updated_at')
      .eq('id', bikeId)
      .maybeSingle();

    if (bike) {
      const batteryPct = bike.battery ? parseInt(bike.battery) : 85;
      return {
        bikeId,
        batteryPct: Math.min(100, Math.max(0, batteryPct)),
        lat: bike.last_lat || null,
        lng: bike.last_lng || null,
        location: bike.location || null,
        speed: 0, // Calculated or streamed
        ignition: bike.is_locked ? "OFF" : "ON",
        movementStatus: bike.last_lat ? "ACTIVE" : "STOPPED",
        motorOk: true,
        isLocked: bike.is_locked === true,
        lastPingAt: bike.last_ping_at || bike.last_gps_updated_at || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error(`[IoT] getBikeHealth failed for bike_id=${bikeId}:`, error.message);
  }

  // Fallback
  return {
    bikeId,
    batteryPct: 85,
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


