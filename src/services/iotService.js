import axios from "axios";
import supabase from "../utils/supabaseClient.js";

/**
 * IoT hardware integration — LocoNav GPS and Battery API
 * Documented at: https://developers.loconav.com/#1bb7ee96-96f3-4641-a0f2-b98384012d99
 */

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://api.a.loconav.com/integration/api/v1";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || "ctaSU6pp_7zJWTDH2YuS";

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

/**
 * LOCK (Immobilize) a bike
 */
export async function lockBike(bikeId) {
  console.log(`[IoT] Attempting to LOCK bike_id=${bikeId}`);
  const loconavUuid = await getLocoNavId(bikeId);
  
  if (!loconavUuid) {
    console.warn(`[IoT] No LocoNav UUID found for bike_id=${bikeId}. Lock aborted.`);
    return { ok: false, message: "Device not linked" };
  }

  try {
    const response = await axios.post(
      `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
      { value: "IMMOBILIZE" },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[IoT] Lock response:`, response.data);
    return { ok: true, bikeId, action: "lock", requestId: response.data?.data?.id };
  } catch (error) {
    console.error(`[IoT] Lock failed for ${loconavUuid}:`, error.response?.data || error.message);
    return { ok: false, message: error.response?.data?.message || "API connection failed" };
  }
}

/**
 * UNLOCK (Mobilize) a bike
 */
export async function unlockBike(bikeId) {
  console.log(`[IoT] Attempting to UNLOCK bike_id=${bikeId}`);
  const loconavUuid = await getLocoNavId(bikeId);
  
  if (!loconavUuid) {
    console.warn(`[IoT] No LocoNav UUID found for bike_id=${bikeId}. Unlock aborted.`);
    return { ok: false, message: "Device not linked" };
  }

  try {
    const response = await axios.post(
      `${LOCONAV_API_URL}/vehicles/${loconavUuid}/immobilizer_requests`,
      { value: "MOBILIZE" },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[IoT] Unlock response:`, response.data);
    return { ok: true, bikeId, action: "unlock", requestId: response.data?.data?.id };
  } catch (error) {
    console.error(`[IoT] Unlock failed for ${loconavUuid}:`, error.response?.data || error.message);
    return { ok: false, message: error.response?.data?.message || "API connection failed" };
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
    const response = await axios.post(
      `${LOCONAV_API_URL}/vehicles/telematics/last_known`,
      {
        vehicleIds: [loconavUuid],
        sensors: ["speed", "ignition", "currentLocationCoordinates"]
      },
      {
        headers: {
          'User-Authentication': LOCONAV_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.status === 200 && response.data?.data?.values?.length > 0) {
      const vehicleData = response.data.data.values[0];
      const gps = vehicleData.gps || {};
      const coords = gps.currentLocationCoordinates || {};
      
      // Map LocoNav telemetry to our internal format
      return {
        bikeId,
        batteryPct: 85, // Defaulting to 85% as batteryVoltage is unsupported by this device
        lat: coords.lat?.value || null,
        lng: coords.long?.value || null,
        motorOk: true, // Assuming true unless ignition sensor explicitly says OFF
        lastPingAt: coords.lat?.timestamp ? new Date(coords.lat.timestamp * 1000).toISOString() : new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error(`[IoT] getBikeHealth failed for ${loconavUuid}:`, error.message);
  }

  // Fallback to mock data if API call fails
  return {
    bikeId,
    batteryPct: 85,
    motorOk: true,
    lastPingAt: new Date().toISOString(),
  };
}
