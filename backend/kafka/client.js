// kafka/client.js
// Shared Kafka client — imported by both producer and every consumer.
import { Kafka } from "kafkajs";

export const kafka = new Kafka({
  clientId: "audio-pro-ecommerce",
  brokers: [(process.env.KAFKA_BROKER || "localhost:9092")],
});
