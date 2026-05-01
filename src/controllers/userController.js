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

export const getUserById = async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    console.error("[getUserById]", req.params.id, error);
    return res.status(500).json({
      message: "Fetch failed",
      error,
    });
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
  const body = req.body ?? {};
  const patch = {
    ...(body.full_name !== undefined && { full_name: body.full_name }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.location !== undefined && { location: body.location }),
    ...(body.image_url !== undefined && { image_url: body.image_url }),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", req.params.id)
    .select();

  if (error) {
    return res.status(500).json({
      message: "Update failed",
      error,
    });
  }
  const updated = data?.[0] ?? data ?? null;
  res.json(updated != null ? shapePublicUser(updated) : null);
};
