// product-service/kafka/consumer.js
// Listens to "payment-events" and calls updateProductStockById directly —
// no internal HTTP round-trip needed since we are inside the same process.

import { kafka } from "../../kafka/client.js";
import Product from "../models/productModel.js";
import { updateProductStockById } from "../controllers/productController.js";

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

      for (const { productId, quantity } of items) {
        try {
          // Fetch current stock then compute the decremented value
          const product = await Product.findById(productId).select("stock name");
          if (!product) {
            console.warn(`  ⚠️  Product ${productId} not found — skipping`);
            continue;
          }

          const newStock = Math.max(0, product.stock - quantity);
          await updateProductStockById(productId, newStock);
          console.log(`  ✅ ${product.name}: ${product.stock} → ${newStock}`);
        } catch (err) {
          console.error(`  ❌ Failed to update stock for ${productId}:`, err.message);
        }
      }

      console.log(`✅ [product-service] Stock update complete | intent=${paymentIntentId}`);
    },
  });
};
