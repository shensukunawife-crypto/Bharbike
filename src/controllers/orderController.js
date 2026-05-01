import { asyncHandler } from "../utils/asyncHandler.js";
import * as orderService from "../services/orderService.js";

export const list = asyncHandler(async (req, res) => {
  const orders = await orderService.listAvailableOrders(req.user.id);
  res.json({ success: true, data: orders });
});

export const accept = asyncHandler(async (req, res) => {
  const order = await orderService.acceptOrder(req.user.id, req.body.orderId);
  res.json({ success: true, data: order });
});

export const reject = asyncHandler(async (req, res) => {
  const order = await orderService.rejectOrder(req.user.id, req.body.orderId);
  res.json({ success: true, data: order });
});

export const complete = asyncHandler(async (req, res) => {
  const order = await orderService.completeOrder(req.user.id, req.body.orderId);
  res.json({ success: true, data: order });
});
