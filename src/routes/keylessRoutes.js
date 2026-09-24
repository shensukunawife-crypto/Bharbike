import { Router } from "express";
import { getBikesList, getBikeStatus, controlBike } from "../controllers/keylessController.js";

const router = Router();

router.get("/bikes-list", getBikesList);
router.get("/status", getBikeStatus);
router.get("/status/:bikeCode", getBikeStatus);
router.post("/control", controlBike);

export default router;
