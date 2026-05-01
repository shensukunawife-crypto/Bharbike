import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";

const r = Router();

r.use(authMiddleware);
r.get("/profile", userController.profile);

export default r;
