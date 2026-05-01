import * as paymentConfigService from "../services/paymentConfigService.js";

export const addConfig = async (req, res) => {
  try {
    const { key_id, key_secret, provider = "razorpay" } = req.body;
    if (!key_id || !key_secret) {
      return res.status(400).json({ success: false, message: "Key ID and Secret are required" });
    }
    const data = await paymentConfigService.savePaymentConfig({ provider, key_id, key_secret });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listConfigs = async (req, res) => {
  try {
    const data = await paymentConfigService.listPaymentConfigs();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const activateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await paymentConfigService.activatePaymentConfig(id);
    res.json({ success: true, data, message: "Configuration activated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
