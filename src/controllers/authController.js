import { asyncHandler } from "../utils/asyncHandler.js";
import * as authService from "../services/authService.js";

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginWithPhone(req.body);
  res.json({ success: true, data: result });
});
