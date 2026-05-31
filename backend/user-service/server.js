import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config(); // reads .env from CWD (backend/ locally, /app/ in Docker)

import userRoutes     from "./routes/userRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import contactRoutes  from "./routes/contactRoutes.js";

const app  = express();
const PORT = process.env.USER_SERVICE_PORT || 5001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users",   userRoutes);
app.use("/api/users",   passwordRoutes);   // /forgot-password  /reset-password/:token
app.use("/api/contact", contactRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "user-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ [user-service] MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 [user-service] running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ [user-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
