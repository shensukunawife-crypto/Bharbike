import supabase from '../../utils/supabaseClient.js';

/**
 * A map of URL patterns → human-readable action labels.
 * Matched in order — first match wins.
 * Pattern: { method, regex, label }
 */
const ACTION_MAP = [
  // Users
  { method: 'POST', regex: /\/users\/add/, label: 'Added a new user' },
  { method: 'POST', regex: /\/users\/[^/]+\/edit/, label: 'Edited user profile' },
  { method: 'POST', regex: /\/users\/[^/]+\/block/, label: 'Blocked / Unblocked user' },
  { method: 'POST', regex: /\/users\/[^/]+\/delete/, label: 'Deleted user account' },
  { method: 'POST', regex: /\/users\/[^/]+\/upload-doc/, label: 'Uploaded document for user' },
  { method: 'POST', regex: /\/users\/[^/]+\/remove-doc/, label: 'Removed user document' },
  { method: 'POST', regex: /\/users\/[^/]+\/assign-bike/, label: 'Assigned/Unassigned bike to user' },

  // KYC
  { method: 'POST', regex: /\/kyc-documents\/[^/]+\/status/, label: 'Updated KYC document status' },
  { method: 'POST', regex: /\/kyc-documents\/user\/[^/]+\/delete/, label: 'Deleted KYC document' },
  { method: 'POST', regex: /\/users\/[^/]+\/verify-address/, label: 'Verified user address' },

  // Bikes
  { method: 'POST', regex: /\/bikes\/add/, label: 'Added a new bike' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/assign/, label: 'Assigned bike to user' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/maintenance/, label: 'Sent bike to maintenance' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/disable/, label: 'Disabled/Enabled bike' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/delete/, label: 'Deleted bike' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/lock/, label: 'Locked bike remotely' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/unlock/, label: 'Unlocked bike remotely' },
  { method: 'POST', regex: /\/bikes\/[^/]+\/fixed/, label: 'Marked bike as fixed' },

  // Subscriptions
  { method: 'POST', regex: /\/subscriptions\/[^/]+\/edit/, label: 'Edited subscription' },
  { method: 'POST', regex: /\/subscriptions\/[^/]+\/cancel/, label: 'Cancelled subscription' },
  { method: 'POST', regex: /\/subscriptions\/add/, label: 'Manually added subscription' },
  { method: 'POST', regex: /\/subscription-plans\/[^/]+\/update/, label: 'Updated subscription plan' },

  // Orders & Bookings
  { method: 'POST', regex: /\/orders\/[^/]+\/accept/, label: 'Accepted order' },
  { method: 'POST', regex: /\/orders\/[^/]+\/reject/, label: 'Rejected order' },
  { method: 'POST', regex: /\/orders\/[^/]+\/assign/, label: 'Assigned order to partner' },
  { method: 'POST', regex: /\/orders\/[^/]+\/ongoing/, label: 'Marked order as ongoing' },
  { method: 'POST', regex: /\/orders\/[^/]+\/completed/, label: 'Marked order as completed' },
  { method: 'POST', regex: /\/bookings\/[^/]+\/complete/, label: 'Completed booking' },
  { method: 'POST', regex: /\/bookings\/[^/]+\/cancel/, label: 'Cancelled booking' },

  // Payments & Wallet
  { method: 'POST', regex: /\/payments\/[^/]+\/edit/, label: 'Edited payment record' },
  { method: 'POST', regex: /\/wallet\/[^/]+\/topup/, label: 'Topped up user wallet' },
  { method: 'POST', regex: /\/wallet\/[^/]+\/deduct/, label: 'Deducted from user wallet' },
  { method: 'POST', regex: /\/release-payout/, label: 'Released payout' },

  // Partners
  { method: 'POST', regex: /\/partners\/[^/]+\/approve/, label: 'Approved delivery partner' },
  { method: 'POST', regex: /\/partners\/[^/]+\/reject/, label: 'Rejected delivery partner' },
  { method: 'POST', regex: /\/partners\/[^/]+\/disable/, label: 'Disabled delivery partner' },
  { method: 'POST', regex: /\/partners\/[^/]+\/online/, label: 'Toggled partner online status' },

  // Maintenance
  { method: 'POST', regex: /\/maintenance\/add/, label: 'Created maintenance ticket' },
  { method: 'POST', regex: /\/maintenance\/[^/]+\/status/, label: 'Updated maintenance status' },
  { method: 'POST', regex: /\/maintenance\/[^/]+\/remove/, label: 'Removed maintenance ticket' },
  { method: 'POST', regex: /\/support\/[^/]+\/convert/, label: 'Converted support ticket to maintenance' },
  { method: 'POST', regex: /\/support\/[^/]+\/message/, label: 'Sent support message' },

  // Notifications
  { method: 'POST', regex: /\/notifications\/send/, label: 'Sent push notification to users' },

  // Promo Codes
  { method: 'POST', regex: /\/promo\/add/, label: 'Added promo code' },
  { method: 'POST', regex: /\/promo\/[^/]+\/toggle/, label: 'Toggled promo code on/off' },
  { method: 'POST', regex: /\/promo\/[^/]+\/delete/, label: 'Deleted promo code' },

  // Admin Management
  { method: 'POST', regex: /\/admins\/add/, label: 'Added new admin account' },
  { method: 'POST', regex: /\/admins\/[^/]+\/edit/, label: 'Edited admin account' },
  { method: 'POST', regex: /\/admins\/[^/]+\/toggle/, label: 'Enabled/Disabled admin account' },

  // Settings
  { method: 'POST', regex: /\/settings\/save/, label: 'Saved system settings' },

  // Brain
  { method: 'POST', regex: /\/backend\/force-brain-sweep/, label: 'Forced Subscription Brain sweep' },
];

/**
 * Express middleware that automatically logs any state-changing admin request
 * to brain_activity_logs after the response is sent.
 */
export function adminAuditMiddleware(req, res, next) {
  // Only log mutating methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const url = req.originalUrl.split('?')[0];

  // Find the matching action label
  const match = ACTION_MAP.find(a => a.method === req.method && a.regex.test(url));
  if (!match) {
    return next(); // Not a mapped action — skip
  }

  // Hook into response finish to log after success
  res.on('finish', () => {
    // Only log on 2xx responses (success)
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const admin = req.admin;
    if (!admin) return;

    const adminName = admin.name || admin.email || admin.username || 'Unknown Admin';
    const adminRole = admin.role || 'admin';

    // Extract any IDs from URL for context
    const urlParts = url.split('/').filter(Boolean);
    const targetId = urlParts.find(p => p.length > 10 && p !== 'admin') || null;

    const reason = JSON.stringify({
      _admin: true,
      admin_name: adminName,
      admin_role: adminRole,
      admin_id: admin.admin_id || admin.id || null,
      detail: `${match.label} — URL: ${url}`
    });

    // Non-blocking fire-and-forget
    supabase.from('brain_activity_logs').insert({
      user_id: targetId || 'system',
      user_name: 'N/A',
      action: `ADMIN_${match.label.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`,
      reason,
      old_status: null,
      new_status: null,
      backdated: false,
      created_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.warn('[adminAudit] log insert failed:', error.message);
    });
  });

  next();
}
