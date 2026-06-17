// kafka/producer.js
// Singleton Kafka producer used by the order-service (payment controller).
// Call connectProducer() once at server startup, then use emitPaymentSuccessEvent()
// wherever a PAYMENT_SUCCESSFUL event needs to be published.

import { kafka } from "./client.js";

const producer = kafka.producer();
let _connected = false;

export const connectProducer = async () => {
  if (_connected) return;
  await producer.connect();
  _connected = true;
  console.log("⚡ [Kafka] Producer connected successfully");
};

/**
 * Publishes a PAYMENT_SUCCESSFUL event to the "payment-events" topic.
 *
 * @param {Object} paymentData
 * @param {string} paymentData.paymentIntentId
 * @param {string} paymentData.userId
 * @param {Array}  paymentData.items          – [{ productId, quantity, price }]
 * @param {Object} paymentData.address        – { street, city, state, zipCode, country }
 * @param {number} paymentData.totalAmount
 */
export const emitPaymentSuccessEvent = async (paymentData) => {
  try {
    await producer.send({
      topic: "payment-events",
      messages: [
        {
          // Partition key — guarantees order for the same checkout
          key: paymentData.paymentIntentId,
          value: JSON.stringify({
            eventType: "PAYMENT_SUCCESSFUL",
            ...paymentData,
          }),
        },
      ],
    });
    console.log(
      `📤 [Kafka] PAYMENT_SUCCESSFUL published | intent=${paymentData.paymentIntentId}`
    );
  } catch (error) {
    console.error("❌ [Kafka] Failed to publish PAYMENT_SUCCESSFUL event:", error);
    // Do NOT re-throw — the HTTP response has already been sent by this point.
  }
};
