import { asyncHandler } from "../utils/asyncHandler.js";
import * as rentalService from "../services/rentalService.js";

export const start = asyncHandler(async (req, res) => {
  const rental = await rentalService.startRental(req.user.id, req.body.plan);
  res.status(201).json({ success: true, data: rental });
});

export const end = asyncHandler(async (req, res) => {
  const result = await rentalService.endRental(req.user.id, req.body.rentalId);
  res.json({ success: true, data: result });
});

export const active = asyncHandler(async (req, res) => {
  const rental = await rentalService.getActiveRentalForUser(req.user.id);
  res.json({ success: true, data: rental });
});

export const bookings = asyncHandler(async (req, res) => {
  const rentals = await rentalService.listBookingsForUser(req.user.id);
  res.json({ success: true, data: rentals });
});
