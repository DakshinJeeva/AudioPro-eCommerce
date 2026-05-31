import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config(); // reads .env from CWD (backend/ locally, /app/ in Docker)

import productRoutes from "./routes/productRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

const app = express();
const PORT = process.env.PRODUCT_SERVICE_PORT || 5002;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Static uploads (shared volume / path one level up) ────────────────────────
app.use("/uploads", express.static(path.resolve(__dirname, "./uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/wishlist", wishlistRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "product-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ [product-service] MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 [product-service] running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ [product-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
