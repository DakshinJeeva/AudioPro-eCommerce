// product-service/kafka/consumer.js
// Listens to "payment-events" and calls the product-service's own internal
// HTTP API to decrement stock — no direct model imports.

import { kafka } from "../../kafka/client.js";

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || `http://localhost:${process.env.PRODUCT_SERVICE_PORT || 5002}`;
const INTERNAL_SECRET     = process.env.INTERNAL_SERVICE_SECRET;

const internalHeaders = {
  "Content-Type": "application/json",
  "x-internal-secret": INTERNAL_SECRET,
};

const consumer = kafka.consumer({ groupId: "product-group" });

export const startProductConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment-events", fromBeginning: false });
  console.log("📥 [Kafka][product-service] Consumer running — subscribed to payment-events");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.eventType !== "PAYMENT_SUCCESSFUL") return;

      const { paymentIntentId, items } = event;
      console.log(`🤖 [product-service] Decrementing stock | intent=${paymentIntentId}`);

      try {
        // ── Call POST /api/product/decrement-stock ──────────────────────────
        const res = await fetch(`${PRODUCT_SERVICE_URL}/api/products/decrement-stock`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({ items }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(`❌ [product-service] Stock decrement failed (${res.status}):`, data?.message);
          return;
        }

        console.log(`✅ [product-service] Stock update complete | intent=${paymentIntentId}`);
        data.results?.forEach((r) => console.log(`  • ${r.name || r.productId}: ${r.status}`));
      } catch (err) {
        console.error(`❌ [product-service] Consumer error | intent=${paymentIntentId}:`, err.message);
      }
    },
  });
};
