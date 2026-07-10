import supabase from "../utils/supabaseClient.js";
import * as iotService from "../services/iotService.js";

/**
 * Background job: Refreshes GPS location for all bikes that are linked to LocoNav.
 * Runs every 5 minutes. Writes results back to bikes.last_lat, last_lng, location.
 */
export async function runGpsRefreshJob() {
  try {
    // Fetch all bikes that have a loconav vehicle mapping
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("bike_id, vehicle_uuid")
      .not("bike_id", "is", null);

    if (error || !vehicles?.length) {
      console.log("[gpsRefresh] No linked vehicles found, skipping.");
      return;
    }

    const uuids = vehicles.map(v => v.vehicle_uuid).filter(Boolean);
    console.log(`[gpsRefresh] Refreshing GPS for ${vehicles.length} linked bikes in bulk...`);

    const telemetry = await iotService.getBulkTelemetry(uuids);
    console.log(`[gpsRefresh] LocoNav returned telemetry for ${telemetry.length} vehicles.`);

    let ok = 0;
    let noGps = 0;
    let errors = 0;

    await Promise.allSettled(
      vehicles.map(async ({ bike_id, vehicle_uuid }) => {
        try {
          const val = telemetry.find(t => t.vehicleId === vehicle_uuid);
          if (!val) {
            noGps++;
            return;
          }

          const coords = val.gps?.currentLocationCoordinates || {};
          const lat = coords.lat?.value;
          const lng = coords.long?.value;

          if (lat && lng) {
            const gpsLocationStr = `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
            const pingDate = coords.lat?.timestamp ? new Date(coords.lat.timestamp * 1000) : new Date();

            let batteryPct = 85;
            const batteryData = val.vehicleBatteryLevel;
            if (batteryData && typeof batteryData.value === 'number') {
              const voltage = batteryData.value;
              let calculatedPct = Math.round(((voltage - 11.0) / 1.8) * 100);
              batteryPct = Math.max(0, Math.min(100, calculatedPct));
            }

            await supabase
              .from("bikes")
              .update({
                last_lat: lat,
                last_lng: lng,
                location: gpsLocationStr,
                battery: batteryPct,
                last_gps_updated_at: pingDate.toISOString(),
                last_ping_at: pingDate.toISOString()
              })
              .eq("id", bike_id);

            ok++;
          } else {
            noGps++;
          }
        } catch (err) {
          errors++;
          console.error(`[gpsRefresh] Failed for bike ${bike_id}:`, err.message);
        }
      })
    );

    console.log(`[gpsRefresh] Done: ${ok} updated, ${noGps} no GPS data, ${errors} errors`);
  } catch (err) {
    console.error("[gpsRefresh] Job failed:", err.message);
  }
}
