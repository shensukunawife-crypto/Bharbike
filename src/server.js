/**
 * Production entry: Express (app.js). Heavy work deferred after listen.
 */
import "./config/env.js";
import { assertEnv } from "./config/env.js";
import app from "./app.js";

process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));

const PORT = Number(process.env.PORT);

if (!PORT) {
  console.error("PORT not provided by environment");
  process.exit(1);
}

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});

server.on("error", (err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

setTimeout(() => {
  try {
    assertEnv();
  } catch (e) {
    console.error(e);
  }
}, 1000);

setTimeout(() => {
  import("./config/supabase.js")
    .then(({ verifyRequiredTables }) =>
      verifyRequiredTables().catch(console.error),
    )
    .catch(console.error);
}, 3000);

setTimeout(() => {
  import("./realtime/socketHub.js")
    .then(({ attachRealtime }) => {
      try {
        attachRealtime(server);
      } catch (e) {
        console.error(e);
      }
    })
    .catch(console.error);
}, 4000);

setTimeout(() => {
  import("./jobs/index.js")
    .then(({ startScheduledJobs }) => {
      try {
        startScheduledJobs();
      } catch (e) {
        console.error(e);
      }
    })
    .catch(console.error);
}, 5000);

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
