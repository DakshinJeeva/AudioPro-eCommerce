// backend/controllers/orderController.js
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { sendOrderEmails } from "../utils/sendEmail.js";

// Create order from cart after payment success
export const createOrder = asyncHandler(async (req, res) => {
  const { paymentIntentId, address } = req.body;

  // Ensure user exists and phone is verified
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.isPhoneVerified) {
    return res.status(403).json({ message: "Phone number must be verified before making a purchase" });
  }

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  // Helper to safely get productId from a cart item (supports populated docs and ObjectIds)
  const getCartItemProductId = (item) => {
    if (!item.product) return null;
    if (item.product._id) return item.product._id.toString();
    return item.product.toString();
  };

  // Check stock availability
  for (const item of cart.items) {
    const productId = getCartItemProductId(item);
    if (!productId) {
      return res.status(404).json({ message: "A product in your cart no longer exists." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "A product in your cart could not be found." });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
      });
    }
  }

  // Decrease stock for all items
  for (const item of cart.items) {
    const productId = getCartItemProductId(item);
    if (!productId) continue;
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: -item.quantity }
    });
  }

  // Calculate total amount
  const totalAmount = cart.items.reduce(
    (acc, item) => acc + (item.product.price * item.quantity),
    0
  );

  // Prepare order items with price snapshot
  const orderItems = cart.items.map(item => ({
    product: getCartItemProductId(item),
    quantity: item.quantity,
    price: item.product?.price,
  })).filter(item => item.product); // filter out any items without a valid product

  // Get address from request or user's saved address
  let orderAddress = address;
  if (!orderAddress || !orderAddress.street || !orderAddress.city || !orderAddress.state || !orderAddress.zipCode || !orderAddress.country) {
    if (user.addresses && user.addresses.length > 0) {
      orderAddress = user.addresses[0];
    } else {
      return res.status(400).json({ message: "Complete address is required (street, city, state, zipCode, country)" });
    }
  }

  // Create order
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    totalAmount,
    address: orderAddress,
    paymentStatus: "paid",
    orderStatus: "processing", // Set to processing since payment is successful
    paymentIntentId,
  });

  // Update user's address if provided
  if (address) {
    await User.findByIdAndUpdate(req.user._id, { addresses: [address] });
  }

  // Clear cart after order creation
  cart.items = [];
  await cart.save();

  // Populate product details for response
  const populatedOrder = await Order.findById(order._id)
    .populate("items.product")
    .populate("user", "name email");

  // Fire-and-forget order emails (don't block or fail order on email errors)
  try {
    await sendOrderEmails(populatedOrder);
  } catch (e) {
    console.error("Failed to send order emails:", e.message || e);
  }

  res.status(201).json(populatedOrder);
});

// Get all orders for authenticated user
export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("items.product")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// Get all orders (admin only)
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("items.product")
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// Update order status (admin only)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;

  // Validate orderStatus
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findById(orderId).populate("items.product");
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const previousStatus = order.orderStatus;

  // If order is being cancelled and was not already cancelled, restore stock
  if (orderStatus === "cancelled" && previousStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: item.quantity }
      });
    }
  }
  // If order was cancelled and is being uncancelled, decrease stock again
  else if (previousStatus === "cancelled" && orderStatus !== "cancelled") {
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}` 
        });
      }
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }
  }

  order.orderStatus = orderStatus;
  await order.save();

  // Populate for response
  const populatedOrder = await Order.findById(order._id)
    .populate("items.product")
    .populate("user", "name email");

  res.json(populatedOrder);
});

// Export orders as CSV for a given date range (admin only)
export const exportOrdersCsv = asyncHandler(async (req, res) => {
  const { start, end } = req.query;

  const filter = {};
  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = new Date(start);
    if (end) {
      // include entire end day
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const orders = await Order.find(filter)
    .populate("items.product")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  const headers = [
    "Order ID",
    "Date",
    "Customer Name",
    "Customer Email",
    "Product Name",
    "Quantity",
    "Price",
    "Line Total",
    "Order Total",
    "Status",
    "Payment Status",
    "Street",
    "City",
    "State",
    "ZipCode",
    "Country",
  ];

  const rows = [];
  for (const order of orders) {
    const baseCols = [
      order._id.toString(),
      order.createdAt.toISOString(),
      order.user?.name || "",
      order.user?.email || "",
      "", // product name placeholder
      "",
      "",
      "",
      order.totalAmount?.toString() || "0",
      order.orderStatus,
      order.paymentStatus,
      order.address?.street || "",
      order.address?.city || "",
      order.address?.state || "",
      order.address?.zipCode || "",
      order.address?.country || "",
    ];

    if (order.items.length === 0) {
      rows.push(baseCols);
      continue;
    }

    for (const item of order.items) {
      const price = item.price || item.product?.price || 0;
      const qty = item.quantity || 0;
      const lineTotal = price * qty;
      const cols = [...baseCols];
      cols[4] = item.product?.name || "";
      cols[5] = qty.toString();
      cols[6] = price.toString();
      cols[7] = lineTotal.toString();
      rows.push(cols);
    }
  }

  const escapeCsv = (val) => {
    if (val == null) return "";
    const s = String(val);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csvLines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(","));
  }

  const csv = csvLines.join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="orders_export_${Date.now()}.csv"`
  );

  res.status(200).send(csv);
});

