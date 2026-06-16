import express from "express";
import dotenv from "dotenv";
import { createPaymentIntent } from "../controllers/paymentController.js";

dotenv.config();

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);

export default router;
