import { asyncHandler } from "../utils/asyncHandler.js";
import * as deliveryService from "../services/deliveryService.js";

export const apply = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body?.user_id;
  const data = await deliveryService.applyForDelivery(userId, req.body);
  res.status(201).json({ success: true, status: data?.status || null, data });
});

export const status = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query?.user_id;
  const data = await deliveryService.getDeliveryStatus(userId);
  res.json({ success: true, status: data?.status || null, data });
});

export const setOnline = asyncHandler(async (req, res) => {
  const data = await deliveryService.setPartnerOnline(
    req.user.id,
    Boolean(req.body.is_online)
  );
  res.json({ success: true, data });
});
