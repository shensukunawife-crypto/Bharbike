import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;

function loadServiceAccount() {
  // 1. Try environment variable first (production/Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    try {
      return JSON.parse(rawJson);
    } catch (e) {
      console.warn("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env var directly:", e.message);
      try {
        console.log("[Firebase] Attempting automatic self-healing repair for broken escape sequences (e.g. \\uz instead of \\nuz)...");
        // Repair any broken \nu sequences where 'n' was stripped (resulting in \u followed by base64 chars)
        const repairedJson = rawJson.replace(/\\u/g, '\\nu');
        const parsed = JSON.parse(repairedJson);
        console.log("[Firebase] Auto-repair SUCCESSFUL! Service account JSON parsed cleanly.");
        return parsed;
      } catch (repairErr) {
        console.error("[Firebase] Auto-repair failed:", repairErr.message);
      }
    }
  }

  // 2. Fallback to local file (development)
  const localPath = join(__dirname, "../config/firebase-service-account.json");
  if (existsSync(localPath)) {
    return require(localPath);
  }

  throw new Error(
    "Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env var or add src/config/firebase-service-account.json"
  );
}

export function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = loadServiceAccount();

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("[Firebase] Admin SDK initialized ✅ (project:", serviceAccount.project_id + ")");
  } catch (err) {
    console.error("[Firebase] Failed to initialize Admin SDK:", err.message);
    throw err;
  }

  return firebaseApp;
}

export async function verifyFirebaseIdToken(idToken) {
  const app = getFirebaseAdmin();
  const auth = admin.auth(app);
  const decoded = await auth.verifyIdToken(idToken);
  return decoded;
}

/**
 * Send a push notification to a single FCM device token.
 * Returns true if delivered, false if token is invalid/expired.
 */
export async function sendFcmPush(fcmToken, title, body, data = {}) {
  if (!fcmToken) return false;
  try {
    const app = getFirebaseAdmin();
    const message = {
      token: fcmToken,
      notification: { title: String(title), body: String(body) },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "bharbike_default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };
    await admin.messaging(app).send(message);
    return true;
  } catch (err) {
    // Token no longer valid — caller should remove it from DB
    if (
      err.code === "messaging/registration-token-not-registered" ||
      err.code === "messaging/invalid-registration-token"
    ) {
      console.warn("[FCM] Stale token, should be removed:", fcmToken.slice(0, 20) + "...");
      return "stale";
    }
    console.error("[FCM] sendFcmPush error:", err.message);
    return false;
  }
}

/**
 * Send FCM push to multiple tokens in a single multicast call (max 500).
 * Returns { successCount, failureCount, staleTokens }
 */
export async function sendFcmPushToTokens(fcmTokens, title, body, data = {}) {
  if (!fcmTokens || fcmTokens.length === 0) return { successCount: 0, failureCount: 0, staleTokens: [] };
  try {
    const app = getFirebaseAdmin();
    const message = {
      tokens: fcmTokens,
      notification: { title: String(title), body: String(body) },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "bharbike_default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };
    const response = await admin.messaging(app).sendEachForMulticast(message);
    const staleTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(fcmTokens[i]);
        }
      }
    });
    console.log(`[FCM] Multicast: ${response.successCount} delivered, ${response.failureCount} failed`);
    return { successCount: response.successCount, failureCount: response.failureCount, staleTokens };
  } catch (err) {
    console.error("[FCM] sendFcmPushToTokens error:", err.message);
    return { successCount: 0, failureCount: fcmTokens.length, staleTokens: [] };
  }
}

// Initialize on import
try {
  getFirebaseAdmin();
} catch {
  console.warn("[Firebase] Admin SDK not initialized — will retry on first use");
}
