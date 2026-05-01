import { Router } from "express";
import { createBooking, getBookingsByUser } from "../controllers/bookingController.js";

const router = Router();

router.post("/bookings", createBooking);
router.get("/bookings/:userId", getBookingsByUser);

export default router;
