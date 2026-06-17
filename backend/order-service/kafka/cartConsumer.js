// order-service/kafka/cartConsumer.js
// Listens to "payment-events" and calls the cart-service's internal HTTP API
// to clear the buyer's cart — no direct model imports.

import { kafka } from "../../kafka/client.js";

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || `http://localhost:${process.env.ORDER_SERVICE_PORT || 5003}`;
const INTERNAL_SECRET   = process.env.INTERNAL_SERVICE_SECRET;

const internalHeaders = {
  "Content-Type": "application/json",
  "x-internal-secret": INTERNAL_SECRET,
};

const consumer = kafka.consumer({ groupId: "cart-group" });

export const startCartConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment-events", fromBeginning: false });
  console.log("📥 [Kafka][cart-group] Consumer running — subscribed to payment-events");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.eventType !== "PAYMENT_SUCCESSFUL") return;

      const { paymentIntentId, userId } = event;
      console.log(`🤖 [cart-group] Clearing cart for user=${userId} | intent=${paymentIntentId}`);

      try {
        // ── Call POST /api/cart/clear-by-user ───────────────────────────────
        const res = await fetch(`${ORDER_SERVICE_URL}/api/cart/clear-by-user`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({ userId }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(`❌ [cart-group] Cart clear failed (${res.status}):`, data?.message);
          return;
        }

        console.log(`✅ [cart-group] ${data.message}`);
      } catch (err) {
        console.error(`❌ [cart-group] Consumer error | user=${userId}:`, err.message);
      }
    },
  });
};
