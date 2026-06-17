import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import cartRoutes from "./routes/cartRoutes.js";
import { startCartConsumer } from "./kafka/consumer.js";

const app  = express();
const PORT = process.env.CART_SERVICE_PORT || 5005;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/cart", cartRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "cart-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ [cart-service] MongoDB connected");

    app.listen(PORT, () =>
      console.log(`🚀 [cart-service] running on http://localhost:${PORT}`)
    );

    // ── Kafka: clear cart after payment events ──────────────────────────────
    // Wrapped in try/catch so a missing Kafka broker doesn't crash the service.
    try {
      await startCartConsumer();
    } catch (kafkaErr) {
      console.warn("⚠️  [cart-service] Kafka consumer failed to start (Kafka unavailable?). Service will run without event consumption.", kafkaErr.message);
    }
  })
  .catch((err) => {
    console.error("❌ [cart-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
