import fs from 'fs';
import path from 'path';

// Store logs in the root directory
const LOG_FILE_PATH = path.join(process.cwd(), 'admin_audit_logs.json');

/**
 * Extracts the real IP address from an Express request object
 */
function getClientIp(req) {
  if (!req) return 'Unknown IP';
  // If behind Cloudflare or a reverse proxy
  const cfIp = req.headers && req.headers['cf-connecting-ip'];
  if (cfIp) return cfIp;

  const forwardedFor = req.headers && req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list; the first one is the original client IP
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback to socket IP
  return req.socket?.remoteAddress || req.ip || 'Unknown IP';
}

/**
 * Logs an admin action to a local JSON file.
 * 
 * @param {Object} req - The Express request object
 * @param {string} action - The action performed (e.g. "ASSIGN_PLAN", "CANCEL_PLAN")
 * @param {string} targetUserId - The ID of the user whose account was modified
 * @param {Object} metadata - Any extra details to log
 */
export async function logAdminAction(req, action, targetUserId, metadata = {}) {
  try {
    const ipAddress = getClientIp(req);
    // Extract admin ID if it exists in the token (usually req.user is set by auth middleware)
    const adminId = (req.user && req.user.id) || (req.body && req.body.admin_id) || 'Unknown Admin';

    const logEntry = {
      timestamp: new Date().toISOString(),
      admin_id: adminId,
      action: action,
      target_user_id: targetUserId,
      ip_address: ipAddress,
      metadata: metadata,
      user_agent: (req.headers && req.headers['user-agent']) || 'Unknown'
    };

    // Read existing logs if file exists
    let logs = [];
    if (fs.existsSync(LOG_FILE_PATH)) {
      const fileData = fs.readFileSync(LOG_FILE_PATH, 'utf8');
      if (fileData) {
        try {
          logs = JSON.parse(fileData);
        } catch(e) { logs = []; }
      }
    }

    // Add new log entry at the top
    logs.unshift(logEntry);

    // Write back to file
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
    
    console.log(`[AuditLog] Admin ${adminId} performed ${action} on user ${targetUserId} from IP ${ipAddress}`);
  } catch (error) {
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}
