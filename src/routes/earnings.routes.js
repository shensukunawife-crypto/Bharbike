import { Router } from "express";
import * as earningsController from "../controllers/earningsController.js";
import { authMiddleware } from "../middleware/auth.js";

const r = Router();

r.use(authMiddleware);
r.get("/", earningsController.list);

export default r;
