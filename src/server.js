/**
 * MINIMAL server — no DB / Supabase / Razorpay (Railway healthcheck first).
 * PORT: Railway injects process.env.PORT; local fallback 3000 only.
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

app.get("/", (_req, res) => {
  res.status(200).send("Backend running successfully 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
