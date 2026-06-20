import supabase from "../utils/supabaseClient.js";

/**
 * ENV-first Razorpay keys (Railway / production), then active row in Supabase.
 */
export async function getActivePaymentConfig() {
  const envId = process.env.RAZORPAY_KEY_ID?.trim();
  const envSecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const envEnabled = process.env.RAZORPAY_ENABLED?.trim().toLowerCase() === "true";
  
  if (envId && envSecret && envEnabled) {
    return { provider: "razorpay", key_id: envId, key_secret: envSecret, mode: process.env.RAZORPAY_MODE || "live", is_active: true, source: "env" };
  }

  try {
    const { data, error } = await supabase
      .from("payment_configs")
      .select("id, key_id, key_secret, mode, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data?.key_id || !data?.key_secret) {
      throw new Error("No active payment configuration found");
    }
    
    let provider = "razorpay";
    let cleanKeyId = data.key_id;
    if (data.key_id.startsWith("PHONEPE::")) {
      provider = "phonepe";
      cleanKeyId = data.key_id.replace("PHONEPE::", "");
    } else if (data.key_id.startsWith("RAZORPAY::")) {
      provider = "razorpay";
      cleanKeyId = data.key_id.replace("RAZORPAY::", "");
    }

    return { ...data, provider, key_id: cleanKeyId, source: "database" };
  } catch (error) {
    console.error("[paymentConfigService] getActivePaymentConfig failed:", error.message);
    throw error;
  }
}

/**
 * Admin: List all configs (secrets masked)
 */
export async function listPaymentConfigs() {
  try {
    const { data, error } = await supabase
      .from("payment_configs")
      .select("id, key_id, mode, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return (data || []).map(row => {
      let provider = "razorpay";
      let cleanKeyId = row.key_id;
      if (row.key_id.startsWith("PHONEPE::")) {
        provider = "phonepe";
        cleanKeyId = row.key_id.replace("PHONEPE::", "");
      } else if (row.key_id.startsWith("RAZORPAY::")) {
        provider = "razorpay";
        cleanKeyId = row.key_id.replace("RAZORPAY::", "");
      }
      return { ...row, provider, key_id: cleanKeyId };
    });
  } catch (error) {
    console.error("[paymentConfigService] listPaymentConfigs failed:", error.message);
    return [];
  }
}

/**
 * Admin: Add or update a payment config
 */
export async function savePaymentConfig(payload) {
  const { key_id, key_secret, mode = "test", provider = "razorpay" } = payload;
  const encodedKeyId = provider.toUpperCase() + "::" + key_id;
  const { data, error } = await supabase
    .from("payment_configs")
    .insert([{ key_id: encodedKeyId, key_secret, mode, is_active: false }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Activate a specific config
 */
export async function activatePaymentConfig(configId) {
  await supabase.from("payment_configs").update({ is_active: false }).eq("is_active", true);
  const { data, error } = await supabase
    .from("payment_configs")
    .update({ is_active: true })
    .eq("id", configId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
