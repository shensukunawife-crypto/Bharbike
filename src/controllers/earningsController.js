import { asyncHandler } from "../utils/asyncHandler.js";
import * as earningsService from "../services/earningsService.js";

export const list = asyncHandler(async (req, res) => {
  const [items, summary] = await Promise.all([
    earningsService.listEarnings(req.user.id),
    earningsService.earningsSummary(req.user.id),
  ]);
  res.json({ success: true, data: { items, summary } });
});
