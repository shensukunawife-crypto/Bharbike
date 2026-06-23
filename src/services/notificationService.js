import nodemailer from "nodemailer";
import supabase from "../utils/supabaseClient.js";
import { NOTIFICATION_TEMPLATES } from "../constants/notificationTemplates.js";
import { sendFcmPush } from "../utils/firebaseAdmin.js";


const DEFAULT_SETTINGS = {
    push_enabled: true,
    sms_enabled: false,
    email_enabled: true,
    order_alerts_enabled: true,
    promo_alerts_enabled: true,
};

// SMS Helper via Exotel
export async function sendSmsNotification(phone, message) {
    if (!phone) return false;
    let normalizedPhone = phone.trim();
    if (!normalizedPhone.startsWith("+")) {
        if (normalizedPhone.length === 10) {
            normalizedPhone = "+91" + normalizedPhone;
        } else if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
            normalizedPhone = "+" + normalizedPhone;
        }
    }

    if (process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN) {
        try {
            const apiKey = process.env.EXOTEL_API_KEY;
            const apiToken = process.env.EXOTEL_API_TOKEN;
            const accountSid = process.env.EXOTEL_ACCOUNT_SID || "bharbike1";
            const subdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";
            const senderId = process.env.EXOTEL_SENDER_ID || "BHARBK";

            const authHeader = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
            const url = `https://${subdomain}/v1/Accounts/${accountSid}/Sms/send`;

            const params = new URLSearchParams();
            params.append("From", senderId);
            params.append("To", normalizedPhone);
            params.append("Body", message);

            const axios = (await import("axios")).default;
            const res = await axios.post(url, params.toString(), {
                headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout: 10000
            });
            console.log(`[SMS] Exotel sent to ${normalizedPhone}:`, res.status);
            return true;
        } catch (err) {
            console.error("[SMS] Exotel send failed:", err?.response?.data || err.message);
        }
    }
    console.log(`[SMS Mock] Send to ${normalizedPhone}: ${message}`);
    return false;
}

// Email Helper via Nodemailer
export async function sendEmailNotification(email, subject, message) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();

    // Check if SMTP environment variables are set
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || `"BHAR BIKE Support" <support@bharbike.com>`,
                to: cleanEmail,
                subject: subject,
                text: message,
                html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
                        <h2 style="color: #ff7a00; border-bottom: 2px solid #ff7a00; padding-bottom: 8px;">BHAR BIKE Support</h2>
                        <p style="font-size: 16px; font-weight: bold; color: #333;">${subject}</p>
                        <p style="font-size: 14px; color: #555;">${message}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
                        <p style="font-size: 11px; color: #999;">This is an automated operational email from BhaरBike.</p>
                       </div>`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[Email] Mail sent to ${cleanEmail}:`, info.messageId);
            return true;
        } catch (err) {
            console.error("[Email] Nodemailer send failed:", err.message);
        }
    }
    console.log(`[Email Mock] Sent to ${cleanEmail}: [Subject: ${subject}] - ${message}`);
    return false;
}

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

        const createdNotification = data && data.length > 0 ? data[0] : null;

        // Perform async push/SMS/email dispatch (non-blocking)
        if (createdNotification) {
            (async () => {
                try {
                    // 1. Get user notification preferences
                    const settings = await getNotificationSettings(userId);
                    
                    // 2. Fetch user's FCM token, email, and phone
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("fcm_token, email, phone")
                        .eq("id", userId)
                        .maybeSingle();

                    if (profile) {
                        // A. Push Notification dispatch
                        if (settings.push_enabled && profile.fcm_token) {
                            console.log(`[notificationService] Dispatching FCM push to user ${userId}...`);
                            await sendFcmPush(profile.fcm_token, title, message, { type });
                        }

                        // B. SMS/Phone dispatch (triggered if setting enabled OR if it's a critical subscription_warning alert)
                        const isSubscriptionWarning = type === "subscription_warning";
                        if ((settings.sms_enabled || isSubscriptionWarning) && profile.phone) {
                            console.log(`[notificationService] Dispatching SMS to user ${userId}...`);
                            await sendSmsNotification(profile.phone, message);
                        }

                        // C. Email dispatch
                        if (settings.email_enabled && profile.email) {
                            console.log(`[notificationService] Dispatching Email to user ${userId}...`);
                            await sendEmailNotification(profile.email, title, message);
                        }
                    }
                } catch (dispatchErr) {
                    console.error("[notificationService] Async dispatch failed:", dispatchErr.message);
                }
            })();
        }

        return createdNotification;
    } catch (err) {
        console.error(`[notificationService] Error creating notification for user ${userId}:`, err?.message || err);
        return null;
    }
}

/**
 * Send a predefined templated notification
 */
export async function sendTemplatedNotification(userId, templateKey, variables = {}) {
    try {
        const template = NOTIFICATION_TEMPLATES[templateKey];
        if (!template) {
            console.error(`[notificationService] Predefined template '${templateKey}' not found.`);
            return null;
        }

        let title = template.title;
        let message = template.message;

        // Replace placeholders (e.g. {amount}, {reason}) with variable values
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            title = title.replaceAll(placeholder, String(value));
            message = message.replaceAll(placeholder, String(value));
        }

        return await createUserNotification(userId, title, message, template.type);
    } catch (err) {
        console.error(`[notificationService] sendTemplatedNotification failed for user ${userId}:`, err?.message || err);
        return null;
    }
}


