import supabase from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";

/**
 * Get or create wallet balance for a user
 */
export async function getWalletBalance(userId) {
  const { data, error } = await supabase.rpc("get_or_create_wallet_balance", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[walletService.getWalletBalance] failed", error);
    throw new AppError("Unable to fetch wallet balance", 500);
  }

  return {
    balance: Number(data.balance || 0),
    currency: data.currency || "INR",
    userId: data.user_id,
  };
}

/**
 * Add money to wallet
 */
export async function addMoney(userId, amount, title, paymentId = null, orderId = null) {
  if (!amount || amount <= 0) {
    throw new AppError("Amount must be greater than 0", 400);
  }

  const { data, error } = await supabase.rpc("add_money_to_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_title: title,
    p_payment_id: paymentId,
    p_order_id: orderId,
  });

  if (error) {
    console.error("[walletService.addMoney] failed", error);
    throw new AppError(error.message || "Unable to add money to wallet", 500);
  }

  return data;
}

/**
 * Deduct money from wallet
 */
export async function deductMoney(userId, amount, title, description = null) {
  if (!amount || amount <= 0) {
    throw new AppError("Amount must be greater than 0", 400);
  }

  const { data, error } = await supabase.rpc("deduct_money_from_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_title: title,
    p_description: description,
  });

  if (error) {
    console.error("[walletService.deductMoney] failed", error);
    
    // Check for insufficient balance error
    if (error.message && error.message.includes("Insufficient balance")) {
      throw new AppError(error.message, 400);
    }
    
    throw new AppError(error.message || "Unable to deduct money from wallet", 500);
  }

  return data;
}

/**
 * Get wallet transactions for a user
 */
export async function getTransactions(userId, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[walletService.getTransactions] failed", error);
    throw new AppError("Unable to fetch transactions", 500);
  }

  return data || [];
}

/**
 * Get wallet summary (balance + recent transactions)
 */
export async function getWalletSummary(userId) {
  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    getTransactions(userId, 10),
  ]);

  return {
    balance: balance.balance,
    currency: balance.currency,
    transactions: transactions.map((tx) => ({
      id: tx.id,
      title: tx.title,
      date: tx.created_at,
      amount: Number(tx.amount),
      type: tx.type,
      status: tx.status === "completed" ? (tx.type === "credit" ? "Success" : "Paid") : tx.status,
    })),
  };
}

/**
 * Validate promo code (placeholder - implement your promo logic)
 */
export async function validatePromoCode(userId, code) {
  // TODO: Implement promo code validation with database
  // For now, hardcoded validation
  const validCodes = {
    SAVE50: { amount: 50, description: "₹50 cashback" },
    WELCOME100: { amount: 100, description: "₹100 welcome bonus" },
    RIDE20: { amount: 20, description: "₹20 ride discount" },
  };

  const upperCode = String(code).trim().toUpperCase();
  const promo = validCodes[upperCode];

  if (!promo) {
    throw new AppError("Invalid promo code", 400);
  }

  // Add promo amount to wallet
  await addMoney(userId, promo.amount, `Promo: ${upperCode}`, null, null);

  return {
    success: true,
    message: `Promo applied: ${promo.description} added to wallet`,
    amount: promo.amount,
  };
}
