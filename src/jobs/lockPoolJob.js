import supabase from "../utils/supabaseClient.js";
import * as iot from "../services/iotService.js";
import axios from "axios";
import { createUserNotification } from "../services/notificationService.js";

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://app.loconav.sensorise.net/integration/api/v1";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || "ZBC5heBXfKDx8qcGWcjy";

/**
 * Returns all bikes currently in the Pending Lock Pool
 * (i.e. bikes held by expired/inactive users where hardware lock is still pending/offline)
 */
export async function getPendingLockPool() {
  try {
    const now = new Date();

    // 1. Fetch all expired/cancelled rentals and bikes marked in_use / locked
    const { data: expiredRentals, error: rErr } = await supabase
      .from("rentals")
      .select("id, user_id, bike_id, status, end_time, created_at, bikes(id, bike_code, name, is_locked, status, last_ping_at)")
      .in("status", ["expired", "ongoing", "active"])
      .order("created_at", { ascending: false });

    if (rErr) throw rErr;

    // Filter for bikes where user has NO active subscription
    const userIds = [...new Set((expiredRentals || []).map(r => r.user_id).filter(Boolean))];
    if (userIds.length === 0) return [];

    const [
      { data: activeSubs },
      { data: usersData },
      { data: vehiclesData },
      { data: recentLockLogs }
    ] = await Promise.all([
      supabase
        .from("user_subscriptions")
        .select("user_id, status, end_date")
        .in("user_id", userIds)
        .eq("status", "active")
        .gt("end_date", now.toISOString()),

      supabase
        .from("users")
        .select("id, full_name, name, phone")
        .in("id", userIds),

      supabase
        .from("vehicles")
        .select("id, bike_id, vehicle_uuid, name, vehicle_number"),

      supabase
        .from("bike_lock_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
    ]);

    const activeUserSet = new Set((activeSubs || []).map(s => s.user_id));
    const usersMap = {};
    (usersData || []).forEach(u => { usersMap[u.id] = u; });

    const vehiclesMap = {};
    (vehiclesData || []).forEach(v => {
      if (v.bike_id) vehiclesMap[v.bike_id] = v;
    });

    const pendingPool = [];
    const seenBikeIds = new Set();

    for (const r of (expiredRentals || [])) {
      if (!r.bike_id || seenBikeIds.has(r.bike_id)) continue;

      // If user has an active paid plan, skip
      if (activeUserSet.has(r.user_id)) continue;

      const bike = r.bikes;
      if (!bike) continue;

      // Find the most recent lock log for this bike
      const lastLock = (recentLockLogs || []).find(l => l.bike_id === r.bike_id && l.action === "lock");

      // A bike is in pending lock if:
      // 1. Last lock failed or had an error / unreachable tracker, OR
      // 2. No successful lock has been executed since expiry, OR
      // 3. Last log claimed success but device was offline at the time (device_online_check.online === false)
      const deviceWasOnlineWhenLocked = lastLock?.metadata?.device_online_check?.online !== false;
      const isLockConfirmed = lastLock &&
        lastLock.success === true &&
        lastLock.metadata?.iot_request_id &&
        !lastLock.error_message &&
        deviceWasOnlineWhenLocked; // Must have been online — otherwise the lock never actually executed

      // If lock was not yet confirmed successful on hardware level:
      if (!isLockConfirmed) {
        seenBikeIds.add(r.bike_id);
        const user = usersMap[r.user_id] || null;
        const vehicle = vehiclesMap[r.bike_id] || null;

        pendingPool.push({
          rentalId: r.id,
          bikeId: r.bike_id,
          bikeCode: bike.bike_code || `Bike #${r.bike_id}`,
          userId: r.user_id,
          userName: user ? (user.full_name || user.name || user.phone) : "Unknown",
          userPhone: user?.phone || "N/A",
          loconavUuid: vehicle?.vehicle_uuid || null,
          loconavName: vehicle?.name || null,
          status: "pending_wakeup", // waiting for bike to come online
          lastAttempt: lastLock?.created_at || null,
          lastError: lastLock?.error_message || "Device offline (Waiting for motion / ignition)",
          lastRequestId: lastLock?.metadata?.iot_request_id || null
        });
      }
    }

    return pendingPool;
  } catch (error) {
    console.error("[lockPool.getPendingLockPool] error:", error.message);
    return [];
  }
}

/**
 * Runs the background lock pool sweep:
 * Checks if any bike in the pending pool has come online/moved, and instantly fires lock!
 */
export async function runLockPoolSweep() {
  try {
    const pendingBikes = await getPendingLockPool();

    if (!pendingBikes || pendingBikes.length === 0) {
      // 0 bikes in pool — 0 API calls needed, completely idle
      return { checked: 0, locked: 0 };
    }

    console.log(`[lockPool] Found ${pendingBikes.length} bike(s) waiting in Pending Lock Pool. Checking live LocoNav telemetry...`);

    let lockedCount = 0;

    for (const pb of pendingBikes) {
      if (!pb.loconavUuid) continue;

      let onlineCheck;
      try {
        onlineCheck = await iot.checkDeviceOnline(pb.bikeId);
      } catch (err) {
        console.warn(`[lockPool] Telemetry check failed for bike ${pb.bikeCode}:`, err.message);
        continue;
      }

      // Check if bike is Online / Awake / Moving:
      // 1. online is true (fresh ping received within last 15 minutes)
      // 2. ignition === "ON"
      // 3. speed > 0 km/h
      const isAwake = onlineCheck.online || onlineCheck.ignition === "ON" || (onlineCheck.speed && onlineCheck.speed > 0);

      if (isAwake) {
        console.log(`[lockPool] ⚡ Bike ${pb.bikeCode} is ONLINE / AWAKE (status: ${onlineCheck.status}, ignition: ${onlineCheck.ignition}, speed: ${onlineCheck.speed}km/h)! Firing lock immediately...`);

        try {
          const lockResult = await iot.lockBike(pb.bikeId);
          console.log(`[lockPool] Lock result for ${pb.bikeCode}:`, lockResult);

          if (lockResult && lockResult.ok !== false) {
            lockedCount++;

            // Update bike is_locked status in DB
            await supabase.from("bikes").update({ is_locked: true }).eq("id", pb.bikeId);

            // Insert audit log
            await supabase.from("bike_lock_logs").insert([{
              bike_id: pb.bikeId,
              user_id: pb.userId,
              action: "lock",
              method: "app",
              success: true,
              metadata: {
                triggered_by: "lock_pool_wakeup_retry",
                status_reason: "expired_wakeup_locked",
                iot_request_id: lockResult.requestId || null,
                device_online_check: onlineCheck
              }
            }]);

            // Notify user
            createUserNotification(
              pb.userId,
              "Subscription Expired — Vehicle Immobilized 🔒",
              `Your subscription for ${pb.bikeCode} has expired. The bike has been immobilized. Please renew your plan on the BharBike app to unlock.`,
              "warning"
            ).catch(e => console.warn("[lockPool] Notification failed:", e?.message));
          }
        } catch (lockErr) {
          console.error(`[lockPool] Failed to lock awake bike ${pb.bikeCode}:`, lockErr.message);
        }
      }
    }

    console.log(`[lockPool] Sweep complete: ${lockedCount} of ${pendingBikes.length} pending bike(s) immobilized.`);
    return { checked: pendingBikes.length, locked: lockedCount };
  } catch (error) {
    console.error("[lockPool.runLockPoolSweep] error:", error);
    return { checked: 0, locked: 0, error: error.message };
  }
}
