// order-service/kafka/consumer.js
// Listens to "payment-events" and calls the order-service's own internal HTTP
// API to create the order — no direct model imports.

import { kafka } from "../../kafka/client.js";
import { sendOrderEmails } from "../../utils-service/sendEmail.js";
import Order from "../models/orderModel.js";

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || `http://localhost:${process.env.ORDER_SERVICE_PORT || 5003}`;
const INTERNAL_SECRET   = process.env.INTERNAL_SERVICE_SECRET;

const internalHeaders = {
  "Content-Type": "application/json",
  "x-internal-secret": INTERNAL_SECRET,
};

const consumer = kafka.consumer({ groupId: "order-group" });

export const startOrderConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment-events", fromBeginning: false });
  console.log("📥 [Kafka][order-service] Consumer running — subscribed to payment-events");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.eventType !== "PAYMENT_SUCCESSFUL") return;

      const { paymentIntentId, userId, items, address, totalAmount } = event;
      console.log(`🤖 [order-service] Processing PAYMENT_SUCCESSFUL | intent=${paymentIntentId}`);

      try {
        // ── Call POST /api/orders/internal ──────────────────────────────────
        const res = await fetch(`${ORDER_SERVICE_URL}/api/orders/internal`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({ userId, paymentIntentId, items, address, totalAmount }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(`❌ [order-service] Order creation failed (${res.status}):`, data?.message);
          return;
        }

        if (data.skipped) {
          console.warn(`⚠️  [order-service] Duplicate — order already exists for intent=${paymentIntentId}`);
          return;
        }

        console.log(`✅ [order-service] Order ${data._id} created for user=${userId}`);

        // ── Send confirmation email using the created order's details ───────
        // Fetch the full populated order for the email template
        const populated = await Order.findById(data._id)
          .populate("items.product")
          .populate("user", "name email");

        if (populated) {
          try {
            await sendOrderEmails(populated);
          } catch (emailErr) {
            console.error("[order-service] Email send failed:", emailErr.message);
          }
        }
      } catch (err) {
        console.error(`❌ [order-service] Consumer error | intent=${paymentIntentId}:`, err.message);
      }
    },
  });
};
