import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config(); // reads .env from CWD (backend/ locally, /app/ in Docker)

import orderRoutes   from "./routes/orderRoutes.js";
import cartRoutes    from "./routes/cartRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app  = express();
const PORT = process.env.ORDER_SERVICE_PORT || 5003;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/orders",  orderRoutes);
app.use("/api/cart",    cartRoutes);
app.use("/api/payment", paymentRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "order-service", status: "ok", port: PORT })
);

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ [order-service] MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 [order-service] running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ [order-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
