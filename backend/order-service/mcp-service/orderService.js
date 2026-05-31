import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import User from "../../user-service/models/userModel.js";
import Product from "../../product-service/models/productModel.js";
import { sendOrderEmails } from "../../utils-service/sendEmail.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const getCartItemProductId = (item) => {
  if (!item.product) return null;
  if (item.product._id) return item.product._id.toString();
  return item.product.toString();
};

// ─── createOrderService ───────────────────────────────────────────────────────
export const createOrderService = async ({ userId, paymentIntentId, address }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.isPhoneVerified) throw new Error("Phone number must be verified before making a purchase");

  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  // Stock check
  for (const item of cart.items) {
    const productId = getCartItemProductId(item);
    if (!productId) throw new Error("A product in your cart no longer exists.");
    const product = await Product.findById(productId);
    if (!product) throw new Error("A product in your cart could not be found.");
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }
  }

  // Decrement stock
  for (const item of cart.items) {
    const productId = getCartItemProductId(item);
    if (!productId) continue;
    await Product.findByIdAndUpdate(productId, { $inc: { stock: -item.quantity } });
  }

  const totalAmount = cart.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  const orderItems = cart.items
    .map((item) => ({
      product: getCartItemProductId(item),
      quantity: item.quantity,
      price: item.product?.price,
    }))
    .filter((item) => item.product);

  // Resolve address
  let orderAddress = address;
  if (!orderAddress?.street || !orderAddress?.city || !orderAddress?.state || !orderAddress?.zipCode || !orderAddress?.country) {
    if (user.addresses?.length > 0) {
      orderAddress = user.addresses[0];
    } else {
      throw new Error("Complete address is required (street, city, state, zipCode, country)");
    }
  }

  const order = await Order.create({
    user: userId,
    items: orderItems,
    totalAmount,
    address: orderAddress,
    paymentStatus: "paid",
    orderStatus: "processing",
    paymentIntentId,
  });

  if (address) {
    await User.findByIdAndUpdate(userId, { addresses: [address] });
  }

  cart.items = [];
  await cart.save();

  const populated = await Order.findById(order._id)
    .populate("items.product")
    .populate("user", "name email");

  try {
    await sendOrderEmails(populated);
  } catch (e) {
    console.error("Failed to send order emails:", e.message || e);
  }

  return populated;
};

// ─── getUserOrdersService ─────────────────────────────────────────────────────
export const getUserOrdersService = async ({ userId }) => {
  return Order.find({ user: userId })
    .populate("items.product")
    .sort({ createdAt: -1 });
};

// ─── getAllOrdersService ──────────────────────────────────────────────────────
export const getAllOrdersService = async () => {
  return Order.find({})
    .populate("items.product")
    .populate("user", "name email")
    .sort({ createdAt: -1 });
};

// ─── updateOrderStatusService ─────────────────────────────────────────────────
export const updateOrderStatusService = async ({ orderId, orderStatus }) => {
  if (!VALID_STATUSES.includes(orderStatus)) {
    throw new Error(`Invalid order status. Valid values: ${VALID_STATUSES.join(", ")}`);
  }

  const order = await Order.findById(orderId).populate("items.product");
  if (!order) throw new Error("Order not found");

  const previousStatus = order.orderStatus;

  if (orderStatus === "cancelled" && previousStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: item.quantity } });
    }
  } else if (previousStatus === "cancelled" && orderStatus !== "cancelled") {
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`);
      }
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }
  }

  order.orderStatus = orderStatus;
  await order.save();

  return Order.findById(order._id)
    .populate("items.product")
    .populate("user", "name email");
};

// ─── getOrderSummaryService ───────────────────────────────────────────────────
// Human-readable summary of a user's orders for the MCP assistant
export const getOrderSummaryService = async ({ userId }) => {
  const orders = await Order.find({ user: userId })
    .populate("items.product")
    .sort({ createdAt: -1 });

  if (orders.length === 0) return "You have no orders yet.";

  return orders.map((o) => {
    const items = o.items
      .map((i) => `  • ${i.product?.name || "Unknown"} × ${i.quantity} @ ₹${i.price}`)
      .join("\n");
    return `Order ${o._id}\n  Status: ${o.orderStatus} | Payment: ${o.paymentStatus}\n  Total: ₹${o.totalAmount}\n  Placed: ${o.createdAt.toDateString()}\n${items}`;
  }).join("\n\n");
};
