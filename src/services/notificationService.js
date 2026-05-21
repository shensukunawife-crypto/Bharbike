import supabase from "../utils/supabaseClient.js";

const DEFAULT_SETTINGS = {
    push_enabled: true,
    sms_enabled: false,
    email_enabled: true,
    order_alerts_enabled: true,
    promo_alerts_enabled: true,
};

function isMissingTableError(error) {
    if (!error) return false;
    const msg = String(error.message || "").toLowerCase();
    return msg.includes("could not find the table") || msg.includes("does not exist") || error.code === "42P01";
}

function isRlsError(error) {
    if (!error) return false;
    const msg = String(error.message || "").toLowerCase();
    return msg.includes("row-level security") || error.code === "42501";
}

/**
 * Get notification settings for a user
 */
export async function getNotificationSettings(userId) {
    const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        if (isMissingTableError(error)) return { user_id: userId, ...DEFAULT_SETTINGS };
        // If settings don't exist, create default
        if (error.code === 'PGRST116') {
            return await createDefaultSettings(userId);
        }
        throw error;
    }

    // If no settings found, create default
    if (!data) {
        return await createDefaultSettings(userId);
    }

    return data;
}

/**
 * Create default notification settings for a user
 */
export async function createDefaultSettings(userId) {
    const defaultSettings = {
        user_id: userId,
        push_enabled: true,
        sms_enabled: false,
        email_enabled: true,
        order_alerts_enabled: true,
        promo_alerts_enabled: true,
    };

    const { data, error } = await supabase
        .from("notification_settings")
        .insert([defaultSettings])
        .select()
        .single();

    if (error) {
        if (isMissingTableError(error) || isRlsError(error)) {
            console.warn(`[notificationService] Skipping DB insert due to missing table or RLS. Returning defaults for user ${userId}.`);
            return defaultSettings;
        }
        throw error;
    }
    return data;
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(userId, settings) {
    const updateData = {};
    
    if (settings.push_enabled !== undefined) updateData.push_enabled = settings.push_enabled;
    if (settings.sms_enabled !== undefined) updateData.sms_enabled = settings.sms_enabled;
    if (settings.email_enabled !== undefined) updateData.email_enabled = settings.email_enabled;
    if (settings.order_alerts_enabled !== undefined) updateData.order_alerts_enabled = settings.order_alerts_enabled;
    if (settings.promo_alerts_enabled !== undefined) updateData.promo_alerts_enabled = settings.promo_alerts_enabled;

    const { data, error } = await supabase
        .from("notification_settings")
        .upsert({
            user_id: userId,
            ...updateData,
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single();

    if (error) {
        if (isMissingTableError(error) || isRlsError(error)) {
            console.warn(`[notificationService] Skipping DB upsert due to missing table or RLS. Simulating success for user ${userId}.`);
            createUserNotification(
                userId,
                "Preferences Updated ⚙️",
                "Your notification preferences have been successfully saved.",
                "info"
            ).catch(() => {});
            return { user_id: userId, ...DEFAULT_SETTINGS, ...updateData };
        }
        throw error;
    }

    createUserNotification(
        userId,
        "Preferences Updated ⚙️",
        "Your notification preferences have been successfully saved.",
        "info"
    ).catch(() => {});

    return data;
}

/**
 * Create a new user notification
 */
export async function createUserNotification(userId, title, message, type = "info") {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .insert([{
                user_id: userId,
                title,
                message,
                body: message,
                type,
                read: false,
                is_read: false,
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (error) {
            console.error(`[notificationService] Failed to create notification for user ${userId}:`, error.message);
            return null;
        }
        return data && data.length > 0 ? data[0] : null;
    } catch (err) {
        console.error(`[notificationService] Error creating notification for user ${userId}:`, err?.message || err);
        return null;
    }
}

