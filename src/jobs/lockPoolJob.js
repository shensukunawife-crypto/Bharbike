import supabase from "../utils/supabaseClient.js";
import * as iot from "../services/iotService.js";
import axios from "axios";
import { createUserNotification } from "../services/notificationService.js";
import { hasPassedGracePeriod } from "../services/subscriptionService.js";

const LOCONAV_API_URL = process.env.LOCONAV_API_URL || "https://app.loconav.sensorise.net/integration/api/v1";
const LOCONAV_TOKEN = process.env.LOCONAV_TOKEN || "ZBC5heBXfKDx8qcGWcjy";

/**
 * Returns all bikes currently in the Pending Lock Pool
 * (i.e. bikes held by expired/inactive users where hardware lock is still pending/offline)
 */
export async function getPendingLockPool() {
  try {
    const now = new Date();

    // 1. Fetch all recent rentals (including completed) to evaluate each bike on its true latest rental
    const { data: expiredRentals, error: rErr } = await supabase
      .from("rentals")
      .select("id, user_id, bike_id, status, end_time, created_at, bikes(id, bike_code, name, is_locked, status, last_ping_at)")
      .in("status", ["expired", "ongoing", "active", "completed"])
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
        .in("status", ["active", "ongoing"]),

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
        .limit(500)
    ]);

    // A rider is in active standing (and protected from lock) if their subscription is active/ongoing
    // AND they have not passed the 09:30 AM IST next-day grace period!
    const activeUserSet = new Set();
    (activeSubs || []).forEach(s => {
      if (s.end_date) {
        const isFuture = new Date(s.end_date) > now;
        const inGrace = !hasPassedGracePeriod(s.end_date);
        if (isFuture || inGrace) {
          activeUserSet.add(s.user_id);
        }
      }
    });
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
      seenBikeIds.add(r.bike_id); // Evaluate each bike ONLY on its most recent rental!

      // If the most recent rental is completed, the bike has been returned
      if (r.status === "completed") {
        // Auto-heal: If bike is erroneously still marked in_use in DB, fix it to available
        if (r.bikes && r.bikes.status === "in_use") {
          supabase.from("bikes").update({ status: "available" }).eq("id", r.bike_id).then(() => {});
        }
        continue;
      }

      // If the current rider has an active paid plan, bike is in good standing -> skip!
      if (activeUserSet.has(r.user_id)) continue;

      const bike = r.bikes;
      if (!bike) continue;

      // Only bikes currently in use by riders are tracked in the pending lock pool
      if (bike.status !== "in_use") continue;

      // A lock is only confirmed for this rental cycle if:
      // 1. The bike is marked locked in DB (bike.is_locked === true)
      // 2. A successful lock was executed around or after this rental's expiration (with 60-minute buffer)
      // 3. No newer unlock occurred after that lock
      // 4. The tracker was not completely dead (>24h offline) when lock was attempted
      const expiryThreshold = r.end_time 
        ? new Date(new Date(r.end_time).getTime() - 60 * 60 * 1000) 
        : new Date(new Date(r.created_at).getTime() - 60 * 60 * 1000);

      const lastLock = (recentLockLogs || []).find(l => 
        l.bike_id === r.bike_id && 
        l.action === "lock" && 
        new Date(l.created_at) >= expiryThreshold
      );

      const lastUnlock = (recentLockLogs || []).find(l => 
        l.bike_id === r.bike_id && 
        l.action === "unlock" && 
        new Date(l.created_at) >= expiryThreshold
      );

      const unlockedAfterLastLock = lastUnlock && lastLock && new Date(lastUnlock.created_at) > new Date(lastLock.created_at);

      // Verify hardware delivery status directly from LocoNav if a request ID exists
      if (lastLock && lastLock.metadata?.iot_request_id && !lastLock.metadata?.loconav_verified) {
        try {
          const reqId = lastLock.metadata.iot_request_id;
          if (reqId && !String(reqId).startsWith("already-") && !String(reqId).startsWith("loconav-")) {
            const locoStatus = await iot.getLockUnlockStatus(reqId);
            if (locoStatus && locoStatus.ok) {
              if (locoStatus.status === "error") {
                // Device was unreachable over cellular network (e.g. offline/dead)
                lastLock.success = false;
                lastLock.error_message = locoStatus.message || "Could not signal device";
                supabase.from("bike_lock_logs").update({
                  success: false,
                  error_message: lastLock.error_message,
                  metadata: { ...lastLock.metadata, loconav_verified: true, loconav_status: "error" }
                }).eq("id", lastLock.id).then(() => {});
              } else if (locoStatus.status === "success" || locoStatus.status === "failure") {
                lastLock.metadata.loconav_verified = true;
                supabase.from("bike_lock_logs").update({
                  metadata: { ...lastLock.metadata, loconav_verified: true, loconav_status: locoStatus.status }
                }).eq("id", lastLock.id).then(() => {});
              }
            }
          }
        } catch (e) {
          // Non-blocking on network error
        }
      }

      // A device is considered dead/disconnected only if its last ping age was > 24 hours (1440 min)
      // Parked bikes overnight (<24h) still receive cellular/SMS commands reliably from LocoNav
      const pingAgeMin = lastLock?.metadata?.device_online_check?.pingAgeMinutes;
      const trackerWasDead = typeof pingAgeMin === "number" && pingAgeMin > 1440;

      const isLockConfirmed = bike.is_locked === true &&
        lastLock &&
        lastLock.success === true &&
        lastLock.metadata?.iot_request_id &&
        !lastLock.error_message &&
        !unlockedAfterLastLock &&
        !trackerWasDead;

      // If lock was not yet confirmed successful on hardware level:
      if (!isLockConfirmed) {
        const user = usersMap[r.user_id] || null;
        const vehicle = vehiclesMap[r.bike_id] || null;

        let lastErrorMsg = "Device offline (Waiting for motion / ignition)";
        if (trackerWasDead) {
          const daysAgo = Math.round(pingAgeMin / 1440);
          lastErrorMsg = `Tracker offline for ${daysAgo}d (Device dead / unpowered)`;
        } else if (lastLock?.error_message) {
          lastErrorMsg = lastLock.error_message;
        } else if (bike.is_locked === false) {
          lastErrorMsg = "Unlocked in database (Needs immobilize command)";
        } else if (!lastLock) {
          lastErrorMsg = "No lock attempt recorded for current expiry";
        }

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
          lastError: lastErrorMsg,
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
 * Returns all bikes held by ACTIVE paid riders where an unlock command failed
 * or is still pending confirmation on LocoNav hardware.
 */
export async function getPendingUnlockPool() {
  try {
    const now = new Date();

    // 1. Fetch all ongoing/active rentals
    const { data: ongoingRentals, error: rErr } = await supabase
      .from("rentals")
      .select("id, user_id, bike_id, status, end_time, created_at, bikes(id, bike_code, name, is_locked, status, last_ping_at)")
      .in("status", ["ongoing", "active"])
      .order("created_at", { ascending: false });

    if (rErr) throw rErr;

    const userIds = [...new Set((ongoingRentals || []).map(r => r.user_id).filter(Boolean))];
    if (userIds.length === 0) return [];

    const [
      { data: activeSubs },
      { data: usersData },
      { data: vehiclesData },
      { data: recentLogs }
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
      if (v.bike_id && v.vehicle_uuid) vehiclesMap[v.bike_id] = v;
    });

    const pendingUnlocks = [];
    const seenBikeIds = new Set();

    for (const r of (ongoingRentals || [])) {
      if (!r.bike_id || seenBikeIds.has(r.bike_id)) continue;
      seenBikeIds.add(r.bike_id);

      // ONLY for users who HAVE an active paid subscription!
      if (!activeUserSet.has(r.user_id)) continue;

      const bike = r.bikes;
      if (!bike) continue;

      const vehicle = vehiclesMap[r.bike_id];
      if (!vehicle) continue; // Skip unlinked bikes with no tracker

      // Find the most recent lock/unlock log for this bike
      const lastLog = (recentLogs || []).find(l => l.bike_id === r.bike_id);

      // Needs unlock retry if:
      // 1. The bike is marked is_locked: true in DB (despite active subscription!)
      // 2. OR the most recent log was an unlock that FAILED (e.g. timeout of 15000ms exceeded)
      const isFailedUnlock = lastLog && lastLog.action === "unlock" && lastLog.success === false;
      const isStillLocked = bike.is_locked === true;

      if (isFailedUnlock || isStillLocked) {
        const user = usersMap[r.user_id] || null;
        pendingUnlocks.push({
          rentalId: r.id,
          bikeId: r.bike_id,
          bikeCode: bike.bike_code || `Bike #${r.bike_id}`,
          userId: r.user_id,
          userName: user ? (user.full_name || user.name || user.phone) : "Unknown",
          userPhone: user?.phone || "N/A",
          loconavUuid: vehicle.vehicle_uuid,
          loconavName: vehicle.name || null,
          status: "pending_unlock_retry",
          lastAttempt: lastLog?.created_at || null,
          lastError: lastLog?.error_message || (isStillLocked ? "Bike still locked in DB despite active plan" : "Unlock failed"),
          lastRequestId: lastLog?.metadata?.iot_request_id || null
        });
      }
    }

    return pendingUnlocks;
  } catch (err) {
    console.error("[lockPool.getPendingUnlockPool] error:", err.message);
    return [];
  }
}

/**
 * Runs the background lock & unlock pool sweep:
 * 1. Checks if any expired bike in the pending pool has come online/moved, and instantly fires lock!
 * 2. Checks if any active paid rider's bike had a failed/timed-out unlock, and retries unlock until confirmed!
 */
export async function runLockPoolSweep() {
  try {
    const pendingBikes = await getPendingLockPool();
    const pendingUnlocks = await getPendingUnlockPool();

    const totalToProcess = (pendingBikes?.length || 0) + (pendingUnlocks?.length || 0);
    if (totalToProcess === 0) {
      return { checked: 0, locked: 0, unlocked: 0 };
    }

    console.log(`[lockPool] Sweep started: ${pendingBikes?.length || 0} pending lock(s), ${pendingUnlocks?.length || 0} pending unlock retry(ies).`);

    let lockedCount = 0;
    let unlockedCount = 0;

    // PART 1: Pending Locks (Expired Riders)
    for (const pb of (pendingBikes || [])) {
      if (!pb.loconavUuid) continue;

      let onlineCheck;
      try {
        onlineCheck = await iot.checkDeviceOnline(pb.bikeId);
      } catch (err) {
        console.warn(`[lockPool] Telemetry check failed for bike ${pb.bikeCode}:`, err.message);
        continue;
      }

      // Live telemetry status check (captured for audit logs and dashboard sensor inspection)
      const isMoving = Number(onlineCheck.speed || 0) > 3;
      const isIgnitionOn = String(onlineCheck.ignition || "").toUpperCase() === "ON";
      const isAwake = onlineCheck.online || isMoving || isIgnitionOn;

      // Avoid spamming LocoNav API every 3 min if device is offline and command was already dispatched recently:
      const hasRecentAttempt = pb.lastAttempt && (Date.now() - new Date(pb.lastAttempt).getTime() < 15 * 60 * 1000);
      if (!isAwake && hasRecentAttempt) {
        continue; // Wait for tracker wakeup or 15-minute retry interval
      }

      console.log(`[lockPool] ⚡ Dispatching IMMOBILIZE command for ${pb.bikeCode} (online: ${onlineCheck.online}, status: ${onlineCheck.status}, ignition: ${onlineCheck.ignition}, speed: ${onlineCheck.speed}km/h). LocoNav hardware safety relay active...`);

        try {
          const lockResult = await iot.lockBike(pb.bikeId);
          console.log(`[lockPool] Lock result for ${pb.bikeCode}:`, lockResult);

          if (lockResult && lockResult.ok !== false) {
            lockedCount++;
            await supabase.from("bikes").update({ is_locked: true }).eq("id", pb.bikeId);

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

            createUserNotification(
              pb.userId,
              "Subscription Expired — Vehicle Immobilized 🔒",
              `Your subscription for ${pb.bikeCode} has expired. The bike has been immobilized. Please renew your plan on the BharBike app to unlock.`,
              "warning"
            ).catch(e => console.warn("[lockPool] Notification failed:", e?.message));
          } else {
            // Log failed attempt so it appears on dashboard and keeps retrying
            await supabase.from("bike_lock_logs").insert([{
              bike_id: pb.bikeId,
              user_id: pb.userId,
              action: "lock",
              method: "app",
              success: false,
              error_message: lockResult?.message || "Lock attempt failed",
              metadata: {
                triggered_by: "lock_pool_wakeup_retry",
                status_reason: "lock_attempt_failed",
                device_online_check: onlineCheck
              }
            }]);
          }
        } catch (lockErr) {
          console.error(`[lockPool] Failed to lock awake bike ${pb.bikeCode}:`, lockErr.message);
        }
      await new Promise(r => setTimeout(r, 1000)); // Respect LocoNav rate limit
    }

    // PART 2: Pending Unlocks (Active Paid Riders whose unlock failed/timed out)
    for (const pu of (pendingUnlocks || [])) {
      console.log(`[lockPool] ⚡ Retrying UNLOCK for active paid rider on bike ${pu.bikeCode}...`);
      try {
        const unlockResult = await iot.unlockBike(pu.bikeId);
        console.log(`[lockPool] Unlock retry result for ${pu.bikeCode}:`, unlockResult);

        if (unlockResult && unlockResult.ok !== false) {
          unlockedCount++;
          await supabase.from("bikes").update({ is_locked: false }).eq("id", pu.bikeId);

          await supabase.from("bike_lock_logs").insert([{
            bike_id: pu.bikeId,
            user_id: pu.userId,
            action: "unlock",
            method: "app",
            success: true,
            metadata: {
              triggered_by: "lock_pool_unlock_retry",
              status_reason: "paid_rider_unlock_confirmed",
              iot_request_id: unlockResult.requestId || null
            }
          }]);
          console.log(`[lockPool] ✅ Successfully confirmed UNLOCK for ${pu.bikeCode}!`);
        }
      } catch (uErr) {
        console.error(`[lockPool] Failed to retry unlock for ${pu.bikeCode}:`, uErr.message);
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[lockPool] Sweep complete: ${lockedCount} locked, ${unlockedCount} unlocked.`);
    return { checked: totalToProcess, locked: lockedCount, unlocked: unlockedCount };
  } catch (error) {
    console.error("[lockPool.runLockPoolSweep] error:", error);
    return { checked: 0, locked: 0, error: error.message };
  }
}
