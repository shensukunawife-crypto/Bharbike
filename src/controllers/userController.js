import supabase from "../utils/supabaseClient.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as userService from "../services/userService.js";
import { shapePublicUser } from "../utils/userShape.js";

export const profile = asyncHandler(async (req, res) => {
  const raw = await userService.getProfile(req.user.id);
  const { deliveryRequest, ...profileRow } = raw;
  res.json({
    success: true,
    data: {
      ...shapePublicUser(profileRow),
      deliveryRequest: deliveryRequest ?? null,
    },
  });
});

export const getUsers = async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) {
    console.error("[getUsers]", error);
    return res.status(500).json({ message: "Select failed", error });
  }
  const rows = Array.isArray(data) ? data : [];
  console.log("[getUsers] rows:", rows.length);
  res.json(rows.map(shapePublicUser));
};

const DEMO_ID_RE = /^demo-/i;

// In-memory store for demo user profile edits (persists until server restart)
const demoProfiles = new Map();

function getDemoProfile(id) {
  const stored = demoProfiles.get(id);
  return {
    id,
    full_name: stored?.full_name ?? "Demo Rider",
    email: stored?.email ?? null,
    phone: stored?.phone ?? id.replace("demo-", ""),
    location: stored?.location ?? null,
    avatar_url: stored?.avatar_url ?? null,
    image_url: stored?.image_url ?? null,
  };
}

export const getUserById = async (req, res) => {
  const id = req.params.id;

  // Demo OTP users have non-UUID IDs like "demo-919325296264"
  // Supabase profiles table requires UUID, so return mock data for demo users
  if (DEMO_ID_RE.test(id)) {
    return res.json(shapePublicUser(getDemoProfile(id)));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // If profile not found, try users table
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (userData) {
        return res.json(shapePublicUser({
          ...userData,
          image_url: userData.image_url || userData.avatar_url || null,
        }));
      }
    } catch (e) {
      console.warn("[getUserById] users table fallback skipped:", e?.message);
    }

    // If profile not found, return a default instead of 500
    if (error.code === "PGRST116" || error.message?.includes("No rows found") || error.message?.includes("0 rows")) {
      return res.json(shapePublicUser({
        id,
        full_name: "Rider",
        email: null,
        phone: null,
        location: null,
        avatar_url: null,
      }));
    }
    console.error("[getUserById]", id, error);
    return res.status(500).json({
      message: "Fetch failed",
      error,
    });
  }

  // Also check users table for image_url if profiles doesn't have it
  if (!data.image_url) {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("image_url, avatar_url")
        .eq("id", id)
        .maybeSingle();
      if (userData?.image_url || userData?.avatar_url) {
        data.image_url = userData.image_url || userData.avatar_url;
      }
    } catch (e) {
      console.warn("[getUserById] users image check skipped:", e?.message);
    }
  }

  res.json(shapePublicUser(data));
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createUser = async (req, res) => {
  console.log("Incoming user:", req.body);

  if (!req.body?.id) {
    return res.status(400).json({ message: "User ID missing" });
  }

  const { id, full_name, email, phone, location } = req.body ?? {};

  if (typeof id !== "string") {
    return res.status(400).json({ message: "User ID must be a string UUID" });
  }
  if (!UUID_RE.test(id)) {
    return res.status(400).json({
      message: "id must be a valid auth user UUID (not placeholders like test123)",
    });
  }

  const payload = {
    id,
    full_name: full_name ?? null,
    email: email ?? null,
    phone: phone ?? null,
    location: location ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select();

  console.log("Insert result:", { data, error });

  if (error) {
    return res.status(500).json({
      message: "Insert failed",
      error,
    });
  }

  const created = data?.[0] ?? data ?? null;
  res.status(201).json(created != null ? shapePublicUser(created) : null);
};

export const updateUser = async (req, res) => {
  const id = req.params.id;

  // Demo users can't be persisted to Supabase (non-UUID id), store in memory
  if (DEMO_ID_RE.test(id)) {
    const body = req.body ?? {};
    const existing = getDemoProfile(id);
    const updated = {
      ...existing,
      ...(body.full_name !== undefined && { full_name: body.full_name }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.image_url !== undefined && { image_url: body.image_url, avatar_url: body.image_url }),
    };
    demoProfiles.set(id, updated);
    return res.json(shapePublicUser(updated));
  }

  const body = req.body ?? {};
  const patch = {
    ...(body.full_name !== undefined && { full_name: body.full_name }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.location !== undefined && { location: body.location }),
    ...(body.image_url !== undefined && { avatar_url: body.image_url }),
    ...(body.emergency_contact_name !== undefined && { emergency_contact_name: body.emergency_contact_name }),
    ...(body.emergency_contact_phone !== undefined && { emergency_contact_phone: body.emergency_contact_phone }),
  };

  // Try updating profiles table
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", req.params.id)
    .select();

  if (error) {
    console.warn("[updateUser] profiles update failed:", error.message);
    // Try users table as fallback
    const usersPatch = { ...patch };
    if (body.image_url !== undefined) usersPatch.avatar_url = body.image_url;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .update(usersPatch)
      .eq("id", req.params.id)
      .select();

    if (userError) {
      console.warn("[updateUser] users update also failed:", userError.message);
      return res.status(500).json({ message: "Update failed", error: userError });
    }
    const updated = userData?.[0] ?? userData ?? null;
    return res.json(updated != null ? shapePublicUser(updated) : null);
  }

  // Also update users table for image_url, email, phone sync
  try {
    const usersSync = {};
    if (body.image_url !== undefined) { usersSync.image_url = body.image_url; usersSync.avatar_url = body.image_url; }
    if (body.email !== undefined) usersSync.email = body.email;
    if (body.phone !== undefined) usersSync.phone = body.phone;
    if (Object.keys(usersSync).length > 0) {
      await supabase.from("users").update(usersSync).eq("id", req.params.id);
    }
  } catch (e) {
    console.warn("[updateUser] users sync skipped:", e?.message);
  }

  const updated = data?.[0] ?? data ?? null;
  res.json(updated != null ? shapePublicUser(updated) : null);
};

/**
 * Get user statistics (total rides, distance, savings)
 * GET /api/user/stats/:userId
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Demo users can't query Supabase — return mock stats
  if (DEMO_ID_RE.test(userId)) {
    return res.json({ success: true, data: { total_rides: 0, total_distance: 0, total_savings: 0 } });
  }

  // Get total rides count
  const { count: totalRides, error: ridesError } = await supabase
    .from("rentals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (ridesError) {
    console.error("[getUserStats] rides error:", ridesError);
  }

  // Get rentals with distance data
  const { data: rentals, error: rentalsError } = await supabase
    .from("rentals")
    .select("distance, total_cost")
    .eq("user_id", userId);

  if (rentalsError) {
    console.error("[getUserStats] rentals error:", rentalsError);
  }

  // Calculate total distance and savings
  let totalDistance = 0;
  let totalSavings = 0;

  if (rentals && Array.isArray(rentals)) {
    rentals.forEach((rental) => {
      if (rental.distance) {
        totalDistance += parseFloat(rental.distance) || 0;
      }
      // Calculate savings: assume taxi costs 2x more than bike rental
      if (rental.total_cost) {
        totalSavings += parseFloat(rental.total_cost) || 0;
      }
    });
  }

  res.json({
    success: true,
    data: {
      total_rides: totalRides || 0,
      total_distance: Math.round(totalDistance),
      total_savings: Math.round(totalSavings),
    },
  });
});

/**
 * Initialize user data (wallet, notifications, rewards)
 * POST /api/users/initialize
 */
export const initializeUserData = asyncHandler(async (req, res) => {
  const userId = req.body.user_id || req.user?.id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "user_id is required",
    });
  }

  console.log("[initializeUserData] Initializing user:", userId);

  try {
    // Create wallet balance
    const { error: walletError } = await supabase
      .from("wallet_balances")
      .upsert({
        user_id: userId,
        balance: 0,
        currency: "INR",
      }, { onConflict: "user_id" });

    if (walletError) {
      console.error("[initializeUserData] wallet error:", walletError);
    }

    // Create notification settings
    const { error: notifError } = await supabase
      .from("notification_settings")
      .upsert({
        user_id: userId,
        push_enabled: true,
        sms_enabled: false,
        email_enabled: true,
        ride_updates: true,
        promotions: true,
        reminders: true,
      }, { onConflict: "user_id" });

    if (notifError) {
      console.error("[initializeUserData] notification error:", notifError);
    }

    // Create reward points
    const { error: rewardError } = await supabase
      .from("reward_points")
      .upsert({
        user_id: userId,
        points: 0,
        cashback_value: 0,
      }, { onConflict: "user_id" });

    if (rewardError) {
      console.error("[initializeUserData] reward error:", rewardError);
    }

    res.json({
      success: true,
      message: "User data initialized successfully",
      data: {
        wallet_created: !walletError,
        notifications_created: !notifError,
        rewards_created: !rewardError,
      },
    });
  } catch (error) {
    console.error("[initializeUserData] error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize user data",
    });
  }
});
