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

// Initialize on import
try {
  getFirebaseAdmin();
} catch {
  console.warn("[Firebase] Admin SDK not initialized — will retry on first use");
}
