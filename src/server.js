/**
 * MINIMAL server — no DB / Supabase / Razorpay (Railway healthcheck first).
 * PORT: Railway injects process.env.PORT; local fallback 8000.
 * Restore full API: npm run start:full → src/server.full.js
 */
import cors from "cors";
import express from "express";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.head("/health", (_req, res) => {
  res.status(200).end();
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
