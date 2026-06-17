// backend/payment-service/controllers/paymentController.js
import Stripe from "stripe";
import Cart from "../models/cartModel.js";
import { emitPaymentSuccessEvent } from "../../kafka/producer.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── Step 1: Create Payment Intent ─────────────────────────────────────────────
// Called from the frontend BEFORE the card is charged.
// Returns a clientSecret so the browser can confirm payment directly with Stripe.
export const createPaymentIntent = async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      payment_method_types: ["card"],
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({
      message: "Payment failed",
      error: error.message,
    });
  }
};

// ── Step 2: Payment Success Webhook / Callback ─────────────────────────────────
// Called from the frontend after stripe.confirmCardPayment() resolves successfully.
// Body: { paymentIntentId, address }
// The userId comes from the JWT (req.user injected by protect middleware).
//
// Flow:
//   1. Fetch the live cart to build a snapshot of items + prices.
//   2. Publish PAYMENT_SUCCESSFUL to Kafka.
//   3. Return 200 immediately — all DB writes happen asynchronously in consumers.
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { paymentIntentId, address } = req.body;
    const userId = req.user._id.toString();

    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }

    // Build a self-contained snapshot of cart items (productId, quantity, price)
    // so consumers don't have to look up the cart again after it's been cleared.
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const items = cart.items.map((item) => ({
      productId: item.product._id.toString(),
      quantity: item.quantity,
      price: item.product.price,
    }));

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const paymentPayload = {
      paymentIntentId,
      userId,
      items,      // snapshot — safe to pass to every consumer
      address,
      totalAmount,
    };

    // 💥 Fire-and-forget: publish to Kafka
    // All microservice side-effects (create order, decrement stock, clear cart,
    // send email) are handled by their respective Kafka consumers.
    await emitPaymentSuccessEvent(paymentPayload);

    return res.status(200).json({
      success: true,
      message: "Payment accepted. Your order is being processed.",
    });
  } catch (error) {
    console.error("❌ handlePaymentSuccess error:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
