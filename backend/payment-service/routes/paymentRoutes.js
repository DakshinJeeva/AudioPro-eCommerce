// backend/payment-service/routes/paymentRoutes.js
import express from "express";
import dotenv from "dotenv";
import { createPaymentIntent, handlePaymentSuccess } from "../controllers/paymentController.js";
import { protect } from "../../middleware-service/authMiddleware.js";

dotenv.config();

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);

// Called by the frontend after stripe.confirmCardPayment() succeeds.
// Publishes PAYMENT_SUCCESSFUL to Kafka → all consumers handle DB side-effects.
router.post("/success", protect, handlePaymentSuccess);

export default router;
