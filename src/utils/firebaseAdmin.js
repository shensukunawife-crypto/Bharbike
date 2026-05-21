import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;

export function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = require(join(__dirname, "../config/firebase-service-account.json"));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log("[Firebase] Admin SDK initialized successfully ✅");
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
