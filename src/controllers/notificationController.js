import { asyncHandler } from "../utils/asyncHandler.js";
import * as notificationService from "../services/notificationService.js";
import supabase from "../config/supabase.js";

/**
 * Get notification settings for authenticated user
 * GET /api/notifications/settings
 */
export const getSettings = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settings = await notificationService.getNotificationSettings(userId);

    res.json({
        success: true,
        data: settings,
    });
});

/**
 * Update notification settings
 * PUT /api/notifications/settings
 */
export const updateSettings = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
        push_enabled,
        sms_enabled,
        email_enabled,
        order_alerts_enabled,
        promo_alerts_enabled,
    } = req.body;

    const settings = await notificationService.updateNotificationSettings(userId, {
        push_enabled,
        sms_enabled,
        email_enabled,
        order_alerts_enabled,
        promo_alerts_enabled,
    });

    res.json({
        success: true,
        data: settings,
        message: "Notification settings updated successfully",
    });
});

/**
 * Get notifications for a user
 * GET /api/notifications/:userId
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) throw error;
        return res.json({ success: true, data: data || [] });
    } catch (err) {
        // If notifications table doesn't exist yet, return empty list gracefully
        return res.json({ success: true, data: [] });
    }
});
