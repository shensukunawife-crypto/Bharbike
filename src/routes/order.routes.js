import { Router } from "express";
import { body } from "express-validator";
import * as orderController from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

r.use(authMiddleware);

r.get("/", orderController.list);

const orderIdRules = [body("orderId").isUUID().withMessage("orderId must be UUID")];

r.post("/accept", orderIdRules, validateRequest, orderController.accept);
r.post("/reject", orderIdRules, validateRequest, orderController.reject);
r.post("/complete", orderIdRules, validateRequest, orderController.complete);

export default r;
