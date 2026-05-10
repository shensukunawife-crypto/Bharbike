import { Router } from "express";
import { body } from "express-validator";
import * as walletController from "../controllers/walletController.js";
import { authMiddleware } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";

const r = Router();

// All wallet routes require authentication
r.use(authMiddleware);

// Get wallet balance
r.get("/balance", walletController.getBalance);

// Get wallet summary (balance + recent transactions)
r.get("/summary", walletController.getSummary);

// Get wallet transactions
r.get("/transactions", walletController.getTransactions);

// Add money to wallet
r.post(
  "/add",
  [
    body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than 0"),
    body("title").optional().isString().withMessage("Title must be a string"),
    body("payment_id").optional().isString(),
    body("order_id").optional().isString(),
  ],
  validateRequest,
  walletController.addMoney
);

// Deduct money from wallet
r.post(
  "/deduct",
  [
    body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than 0"),
    body("title").optional().isString().withMessage("Title must be a string"),
    body("description").optional().isString(),
  ],
  validateRequest,
  walletController.deductMoney
);

// Apply promo code
r.post(
  "/promo",
  [body("code").notEmpty().withMessage("Promo code is required")],
  validateRequest,
  walletController.applyPromo
);

export default r;
