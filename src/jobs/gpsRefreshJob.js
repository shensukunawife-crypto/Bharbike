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

    console.log(`[gpsRefresh] Refreshing GPS for ${vehicles.length} linked bikes...`);

    const updates = await Promise.allSettled(
      vehicles.map(async ({ bike_id }) => {
        try {
          const health = await iotService.getBikeHealth(bike_id);
          if (health.lat && health.lng) {
            const gpsLocationStr = `${Number(health.lat).toFixed(5)}, ${Number(health.lng).toFixed(5)}`;
            await supabase
              .from("bikes")
              .update({
                last_lat: health.lat,
                last_lng: health.lng,
                location: gpsLocationStr,
                last_gps_updated_at: new Date().toISOString(),
              })
              .eq("id", bike_id);
            return { bike_id, status: "ok", location: gpsLocationStr };
          }
          return { bike_id, status: "no_gps" };
        } catch (err) {
          return { bike_id, status: "error", error: err.message };
        }
      })
    );

    const ok = updates.filter(r => r.value?.status === "ok").length;
    const noGps = updates.filter(r => r.value?.status === "no_gps").length;
    const errors = updates.filter(r => r.value?.status === "error").length;
    console.log(`[gpsRefresh] Done: ${ok} updated, ${noGps} no GPS data, ${errors} errors`);
  } catch (err) {
    console.error("[gpsRefresh] Job failed:", err.message);
  }
}
