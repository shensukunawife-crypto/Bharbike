import { asyncHandler } from "../utils/asyncHandler.js";
import * as notificationService from "../services/notificationService.js";

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
