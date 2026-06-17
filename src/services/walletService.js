import supabase from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";
import { createUserNotification } from "./notificationService.js";

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

  // Since RPC returns a TABLE, data is an array of rows
  const row = Array.isArray(data) ? data[0] : data;

  return {
    balance: Number(row?.balance || 0),
    currency: row?.currency || "INR",
    userId: row?.user_id || userId,
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

  // Create user notification (non-blocking)
  createUserNotification(
    userId,
    "Money Added Successfully",
    `₹${amount} has been added to your wallet successfully via: ${title}`,
    "wallet"
  ).catch((err) => console.warn("[walletService.addMoney] notification failed (non-blocking):", err?.message));

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

  // Create user notification (non-blocking)
  createUserNotification(
    userId,
    "Payment Successful",
    `₹${amount} has been paid successfully from your wallet for: ${title}`,
    "wallet"
  ).catch((err) => console.warn("[walletService.deductMoney] notification failed (non-blocking):", err?.message));

  // Check low wallet balance (non-blocking)
  try {
    const txData = Array.isArray(data) ? data[0] : data;
    const newBal = txData ? Number(txData.new_balance) : null;
    if (newBal !== null && newBal < 50) {
      createUserNotification(
        userId,
        "Low Wallet Balance ⚠️",
        `Your wallet balance is low (₹${newBal.toFixed(2)}). Please recharge soon to ensure uninterrupted riding.`,
        "wallet"
      ).catch((err) => console.warn("[walletService.deductMoney] low balance notification failed (non-blocking):", err?.message));
    }
  } catch (balErr) {
    console.warn("[walletService.deductMoney] failed to parse remaining balance for low alert:", balErr.message);
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
 * Validate and apply promo code (DB-backed)
 */
export async function validatePromoCode(userId, code) {
  const upperCode = String(code).trim().toUpperCase();

  // Hardcoded special case for BharWeekly
  if (upperCode === "BHARWEEKLY") {
    const weeklyPrice = 999;
    
    // Still record usage to prevent multiple uses
    const { data: existing } = await supabase
      .from("promo_uses")
      .select("id")
      .eq("user_id", userId)
      .eq("notes", "BHARWEEKLY") // Use notes as the identifier for manual codes
      .maybeSingle();

    if (existing) {
      throw new AppError("You have already used this promo code", 400);
    }

    // Add money to wallet
    await addMoney(userId, weeklyPrice, `Promo: BHARWEEKLY — Weekly Plan Special`, null, null);
    
    // Record usage (ignoring if table doesn't have this column, we'll use a fallback or skip)
    await supabase.from("promo_uses").insert([{ 
      user_id: userId,
      promo_id: null, // manual code
      notes: "BHARWEEKLY"
    }]).catch(() => {});

    // Send Promo Code Applied Notification (non-blocking)
    createUserNotification(
      userId,
      "Promo Code Applied! 🎉",
      `Yay! Code BHARWEEKLY applied successfully. Benefit: Weekly Plan Special has been credited to your wallet.`,
      "success"
    ).catch((err) => console.warn("[walletService.validatePromoCode] notification failed:", err?.message));

    return {
      success: true,
      message: `🎉 Promo applied! ₹${weeklyPrice} added to your wallet for the weekly plan.`,
      amount: weeklyPrice,
      code: "BHARWEEKLY",
    };
  }

  // Lookup code in promo_codes table
  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", upperCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[walletService.validatePromoCode]", error);
    throw new AppError("Unable to validate promo code", 500);
  }

  if (!promo) {
    throw new AppError("Invalid or expired promo code", 400);
  }

  // Check expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    throw new AppError("This promo code has expired", 400);
  }

  // Check max uses
  if (promo.max_uses && promo.uses_count >= promo.max_uses) {
    throw new AppError("This promo code has reached its usage limit", 400);
  }

  // Check if user already used this code
  const { data: existing } = await supabase
    .from("promo_uses")
    .select("id")
    .eq("promo_id", promo.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    throw new AppError("You have already used this promo code", 400);
  }

  // Calculate discount amount
  if (promo.discount_type === "percent") {
    throw new AppError("Percent-based promo codes cannot be applied directly to the wallet.", 400);
  }
  const discountAmount = promo.discount_value;

  // Add discount to wallet
  await addMoney(userId, discountAmount, `Promo: ${upperCode} — ${promo.description || "Discount"}`, null, null);

  // Record usage
  await supabase.from("promo_uses").insert([{ promo_id: promo.id, user_id: userId }]).catch(() => {});

  // Increment uses count
  await supabase.from("promo_codes")
    .update({ uses_count: (promo.uses_count || 0) + 1 })
    .eq("id", promo.id)
    .catch(() => {});

  const label = promo.discount_type === "percent"
    ? `${promo.discount_value}% off (₹${discountAmount} added to wallet)`
    : `₹${discountAmount} added to wallet`;

  // Send Promo Code Applied Notification (non-blocking)
  createUserNotification(
    userId,
    "Promo Code Applied! 🎉",
    `Code ${upperCode} has been successfully applied to your account! Benefit: ${promo?.description || "Discount bonus added"}.`,
    "success"
  ).catch((err) => console.warn("[walletService.validatePromoCode] notification failed:", err?.message));

  return {
    success: true,
    message: `🎉 Promo applied! ${label}`,
    amount: discountAmount,
    code: upperCode,
  };
}
