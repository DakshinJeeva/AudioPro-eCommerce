import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import paymentRoutes from "./routes/paymentRoutes.js";
import { connectProducer } from "../kafka/producer.js";

const app  = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 5006;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/payment", paymentRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "payment-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ [payment-service] MongoDB connected");

    app.listen(PORT, () =>
      console.log(`🚀 [payment-service] running on http://localhost:${PORT}`)
    );

    // ── Kafka: connect producer so payment events can be published ──────────
    // Wrapped in try/catch so a missing Kafka broker doesn't crash the service.
    try {
      await connectProducer();
    } catch (kafkaErr) {
      console.warn("⚠️  [payment-service] Kafka producer failed to start (Kafka unavailable?). Payment events will NOT be published.", kafkaErr.message);
    }
  })
  .catch((err) => {
    console.error("❌ [payment-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
