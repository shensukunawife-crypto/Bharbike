import { Router } from "express";
import { createBooking, getBookingsByUser } from "../controllers/bookingController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/bookings", asyncHandler(createBooking));
router.get("/bookings/:userId", asyncHandler(getBookingsByUser));

export default router;
