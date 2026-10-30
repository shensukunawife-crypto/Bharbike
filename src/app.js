import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./api/routes/index.js";
import adminRoutes from "./admin/routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bikeListRoutes from "./routes/bikeListRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import supabase from "./utils/supabaseClient.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

// Bandwidth Optimization: Gzip & Brotli HTTP response compression (slashes egress by 70-85%)
app.use(compression({
  threshold: 1024,
  level: 6,
}));

const baseAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
];

const extraAllowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...baseAllowedOrigins, ...extraAllowedOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Allow all origins for now (you can restrict this later)
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors());

// Railway / load balancers: probes AFTER CORS
app.get("/health", (req, res) => res.status(200).send("OK"));
app.head("/health", (req, res) => res.status(200).end());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static file caching headers (7-day client cache, 304 ETag revalidation)
const staticCacheOptions = {
  maxAge: "7d",
  etag: true,
  lastModified: true,
};

// Serve compliance landing page static files with browser cache
app.use(express.static(path.join(__dirname, "public"), staticCacheOptions));

// Direct Keyless Portal & Decal routes with short cache
app.get("/keyless", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "keyless", "index.html"), {
    maxAge: "1h",
    etag: true,
  });
});
app.get("/keyless/placard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "keyless", "placard.html"), {
    maxAge: "1h",
    etag: true,
  });
});

app.use(express.json({ limit: "15mb" }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "admin", "views"));
app.use("/admin/static", express.static(path.join(__dirname, "admin", "public"), staticCacheOptions));

app.use("/api/users", userRoutes);
app.use("/api/bikes", bikeListRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use(errorHandler);

export default app;
