// order-service/kafka/consumer.js
// Listens to "payment-events" and calls createOrder directly —
// no internal HTTP round-trip needed since we are inside the same process.

import { kafka } from "../../kafka/client.js";
import { sendOrderEmails } from "../../utils-service/sendEmail.js";
import Order from "../models/orderModel.js";
import "../../product-service/models/productModel.js"; // register Product schema for populate()
import { createOrder } from "../controllers/orderController.js";

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
        const result = await createOrder({ userId, paymentIntentId, items, address, totalAmount });

        if (result.skipped) {
          console.warn(`⚠️  [order-service] Duplicate — order already exists for intent=${paymentIntentId}`);
          return;
        }

        console.log(`✅ [order-service] Order ${result.order._id} created for user=${userId}`);

        // ── Send confirmation email using the created order's details ───────
        const populated = await Order.findById(result.order._id)
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
