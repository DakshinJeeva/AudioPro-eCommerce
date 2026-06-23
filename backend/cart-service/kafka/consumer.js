// cart-service/kafka/consumer.js
// Listens to "payment-events" and calls clearCartByUserId directly —
// no internal HTTP round-trip needed since we are inside the same process.

import { kafka } from "../../kafka/client.js";
import { clearCartByUserId } from "../controllers/cartController.js";

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
        await clearCartByUserId(userId);
        console.log(`✅ [cart-group] Cart cleared for user=${userId} | intent=${paymentIntentId}`);
      } catch (err) {
        console.error(`❌ [cart-group] Consumer error | user=${userId}:`, err.message);
      }
    },
  });
};
