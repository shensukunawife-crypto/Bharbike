import { asyncHandler } from "../utils/asyncHandler.js";
import * as walletService from "../services/walletService.js";

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
export const getBalance = asyncHandler(async (req, res) => {
  const balance = await walletService.getWalletBalance(req.user.id);
  res.json({ success: true, data: balance });
});

/**
 * Get wallet summary (balance + transactions)
 * GET /api/wallet/summary
 */
export const getSummary = asyncHandler(async (req, res) => {
  const summary = await walletService.getWalletSummary(req.user.id);
  res.json({ success: true, data: summary });
});

/**
 * Get wallet transactions
 * GET /api/wallet/transactions
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  
  const transactions = await walletService.getTransactions(req.user.id, limit, offset);
  res.json({ success: true, data: transactions });
});

/**
 * Add money to wallet (called after payment verification)
 * POST /api/wallet/add
 */
export const addMoney = asyncHandler(async (req, res) => {
  const { amount, title, payment_id, order_id } = req.body;
  
  const transaction = await walletService.addMoney(
    req.user.id,
    amount,
    title || "Wallet Recharge",
    payment_id,
    order_id
  );
  
  res.json({ success: true, data: transaction });
});

/**
 * Deduct money from wallet
 * POST /api/wallet/deduct
 */
export const deductMoney = asyncHandler(async (req, res) => {
  const { amount, title, description } = req.body;
  
  const transaction = await walletService.deductMoney(
    req.user.id,
    amount,
    title || "Payment",
    description
  );
  
  res.json({ success: true, data: transaction });
});

/**
 * Validate and apply promo code
 * POST /api/wallet/promo
 */
export const applyPromo = asyncHandler(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ success: false, message: "Promo code is required" });
  }
  
  const result = await walletService.validatePromoCode(req.user.id, code);
  res.json(result);
});
