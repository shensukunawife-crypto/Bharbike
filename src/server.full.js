/**
 * Full BharBike API bootstrap (Express app, Supabase, jobs).
 * Use when Railway healthcheck passes: `npm run start:full`
 *
 * Minimal entry for deploy tests: src/server.js
 */

process.on("unhandledRejection", (reason) => {
  console.error("[bootstrap] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[bootstrap] uncaughtException:", err);
});

async function main() {
  console.log("[bootstrap] cwd=", process.cwd());
  console.log("[bootstrap] node=", process.version);
  console.log("[bootstrap] PORT_env=", process.env.PORT ?? "(unset)");

  let assertEnv;
  let app;
  let verifyRequiredTables;
  let attachRealtime;
  let startScheduledJobs;

  try {
    ({ assertEnv } = await import("./config/env.js"));
    ({ default: app } = await import("./app.js"));
    ({ verifyRequiredTables } = await import("./config/supabase.js"));
    ({ attachRealtime } = await import("./realtime/socketHub.js"));
    ({ startScheduledJobs } = await import("./jobs/index.js"));
  } catch (err) {
    console.error("[bootstrap] FATAL: module import failed (wrong Root Directory or missing file?)");
    console.error(err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
    return;
  }

  try {
    console.log("🚀 Server starting...");
    console.log("ENV CHECK:", {
      PORT: process.env.PORT ?? "(unset)",
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!(
        process.env.SUPABASE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
    });

    assertEnv();

    const PORT = process.env.PORT || 8000;

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log("[bootstrap] ready for Railway healthcheck GET /health");
    });

    setImmediate(() => {
      verifyRequiredTables().catch((err) => {
        console.error("Supabase check failed:", err);
      });
    });

    try {
      attachRealtime(server);
    } catch (e) {
      console.error("attachRealtime error:", e);
    }

    try {
      startScheduledJobs();
    } catch (e) {
      console.error("startScheduledJobs error:", e);
    }

    const shutdown = () => {
      console.log("Shutting down HTTP server...");
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 10_000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("[bootstrap] FATAL: listen or startup failed");
    console.error(err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[bootstrap] main() rejected:", err);
  process.exit(1);
});
