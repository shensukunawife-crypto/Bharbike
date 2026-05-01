import { asyncHandler } from "../utils/asyncHandler.js";
import * as bikeService from "../services/bikeService.js";

export const fleetStatus = asyncHandler(async (req, res) => {
  const data = await bikeService.getFleetStatus();
  res.json({ success: true, data });
});
