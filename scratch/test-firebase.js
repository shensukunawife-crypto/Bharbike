import { getFirebaseAdmin } from "../src/utils/firebaseAdmin.js";

try {
  console.log("[Test] Initializing Firebase Admin SDK...");
  const app = getFirebaseAdmin();
  console.log("[Test] Success! Firebase Admin initialized cleanly. Project ID:", app.options.projectId);
  process.exit(0);
} catch (err) {
  console.error("[Test] Failed to initialize Firebase Admin SDK:", err.message);
  process.exit(1);
}
