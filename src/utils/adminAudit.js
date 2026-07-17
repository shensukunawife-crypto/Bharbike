import supabase from '../utils/supabaseClient.js';

/**
 * Log an admin action to brain_activity_logs.
 * We encode admin info inside the `reason` field as a JSON string
 * so we don't need extra columns.
 *
 * @param {Object} opts
 * @param {Object} opts.admin       - req.admin (from JWT: id, name, role, email)
 * @param {string} opts.action      - e.g. 'ADMIN_BIKE_ASSIGNED'
 * @param {string} opts.targetName  - the affected user's name (or 'N/A')
 * @param {string} opts.targetId    - the affected user's ID (or null)
 * @param {string} opts.detail      - human-readable description of what was done
 * @param {string} [opts.oldStatus] - optional old status
 * @param {string} [opts.newStatus] - optional new status
 */
export async function logAdminAction({ admin, action, targetName, targetId, detail, oldStatus, newStatus }) {
  try {
    const adminName = admin?.name || admin?.email || admin?.username || 'Unknown Admin';
    const adminRole = admin?.role || 'admin';

    // Encode admin info into reason as JSON so we can parse it on the logs page
    const reason = JSON.stringify({
      _admin: true,
      admin_name: adminName,
      admin_role: adminRole,
      admin_id: admin?.admin_id || admin?.id || null,
      detail
    });

    await supabase.from('brain_activity_logs').insert({
      user_id: targetId || 'system',
      user_name: targetName || 'N/A',
      action,
      reason,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      backdated: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    // Non-blocking — never crash the main action because of logging
    console.warn('[adminAudit] Failed to log admin action:', err?.message);
  }
}
