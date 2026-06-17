import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config(); // reads .env from CWD (backend/ locally, /app/ in Docker)

import orderRoutes from "./routes/orderRoutes.js";
import { startOrderConsumer } from "./kafka/consumer.js";

const app  = express();
const PORT = process.env.ORDER_SERVICE_PORT || 5003;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/orders", orderRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "order-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ [order-service] MongoDB connected");

    app.listen(PORT, () =>
      console.log(`🚀 [order-service] running on http://localhost:${PORT}`)
    );

    // ── Kafka: listen for payment events to create orders ───────────────────
    // Wrapped in try/catch so a missing Kafka broker doesn't crash the service.
    try {
      await startOrderConsumer();
    } catch (kafkaErr) {
      console.warn("⚠️  [order-service] Kafka failed to start (Kafka unavailable?). Service will run without event consumption.", kafkaErr.message);
    }
  })
  .catch((err) => {
    console.error("❌ [order-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });

