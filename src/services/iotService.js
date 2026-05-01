/**
 * IoT hardware placeholder — replace with real device SDK / MQTT later.
 */
export async function lockBike(bikeId) {
  console.log(`[IoT] LOCK bike_id=${bikeId}`);
  return { ok: true, bikeId, action: "lock" };
}

export async function unlockBike(bikeId) {
  console.log(`[IoT] UNLOCK bike_id=${bikeId}`);
  return { ok: true, bikeId, action: "unlock" };
}

export async function getBikeHealth(bikeId) {
  console.log(`[IoT] HEALTH bike_id=${bikeId}`);
  return {
    bikeId,
    batteryPct: 87,
    motorOk: true,
    lastPingAt: new Date().toISOString(),
  };
}
