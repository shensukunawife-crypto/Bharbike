/**
 * IoT hardware integration — LocoNav GPS and Battery API
 */

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://app.loconav.sensorise.net";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || "ctaSU6pp_7zJWTDH2YuS";


export async function lockBike(bikeId) {
  console.log(`[IoT] LOCK bike_id=${bikeId}`);
  // Place LocoNav/Relay lock API here when available
  return { ok: true, bikeId, action: "lock" };
}

export async function unlockBike(bikeId) {
  console.log(`[IoT] UNLOCK bike_id=${bikeId}`);
  // Place LocoNav/Relay unlock API here when available
  return { ok: true, bikeId, action: "unlock" };
}

export async function getBikeHealth(bikeId) {
  console.log(`[IoT] Fetching LocoNav telemetry for bike_id=${bikeId}`);
  try {
    // Assuming LocoNav standard V3 telematics endpoint or similar vehicle listing
    // Users can adjust the exact endpoint path (e.g. /v3/vehicles or /api/v1/live_data)
    const response = await fetch(`${LOCONAV_API_URL}/api/v3/vehicles/${bikeId}/live_data`, {
      method: 'GET',
      headers: {
        'User-Authentication': LOCONAV_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Adjust property paths according to exact LocoNav response schema
      return {
        bikeId,
        batteryPct: data.data?.battery_percentage || 87,
        lat: data.data?.lat || null,
        lng: data.data?.lng || null,
        motorOk: true,
        lastPingAt: data.data?.updated_at || new Date().toISOString(),
      };
    } else {
      console.warn(`[IoT] LocoNav API returned status ${response.status}. Falling back to mock.`);
    }
  } catch (error) {
    console.error(`[IoT] LocoNav API error: ${error.message}`);
  }

  // Fallback to mock data if API call fails or vehicle not found
  return {
    bikeId,
    batteryPct: 87,
    motorOk: true,
    lastPingAt: new Date().toISOString(),
  };
}
