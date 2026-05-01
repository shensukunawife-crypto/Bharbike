import { Router } from "express";
import * as bikeController from "../controllers/bikeController.js";
import { authMiddleware } from "../middleware/auth.js";

const r = Router();

r.use(authMiddleware);
r.get("/status", bikeController.fleetStatus);

export default r;
