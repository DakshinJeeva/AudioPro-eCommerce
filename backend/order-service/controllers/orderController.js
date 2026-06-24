// backend/order-service/controllers/orderController.js
//
// All order business logic lives here — no dependency on mcp-service.
// Uses the Order model directly (this service owns it).
// ─────────────────────────────────────────────────────────────────────────────
import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import {
  buildKey,
  getCache,
  setCache,
  delCache,
  delCacheByPattern,
  TTL,
} from "../../utils-service/redisClient.js";

// ── Cache key helpers ─────────────────────────────────────────────────────────
// audiopro:order:history:<userId>  → order list for one user
// audiopro:order:all               → full order list (admin)
const orderHistoryKey     = (userId) => buildKey("order", "history", String(userId));
const orderAllKey         = ()       => buildKey("order", "all");
const orderHistoryPattern = ()       => buildKey("order", "history", "*");

// ── Valid statuses ────────────────────────────────────────────────────────────
const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

// ── createOrder ───────────────────────────────────────────────────────────────
// Pure DB + cache logic — no req/res dependency.
// Called directly by the Kafka consumer and wrapped by the HTTP handler below.
export const createOrder = async ({ userId, paymentIntentId, items, address, totalAmount }) => {
  if (!userId || !paymentIntentId || !items || !address || !totalAmount) {
    throw new Error("Missing required fields: userId, paymentIntentId, items, address, totalAmount");
  }

  // Guard: idempotent — skip if this paymentIntent was already recorded
  const existing = await Order.findOne({ paymentIntentId });
  if (existing) {
    console.warn(`[order-service] Duplicate paymentIntent ${paymentIntentId} — skipping`);
    return { skipped: true, orderId: existing._id };
  }

  const orderItems = items.map((i) => ({
    product:  i.productId,
    quantity: i.quantity,
    price:    i.price,
  }));

  const order = await Order.create({
    user:           userId,
    items:          orderItems,
    totalAmount,
    address,
    paymentStatus:  "paid",
    orderStatus:    "processing",
    paymentIntentId,
  });

  // Invalidate Redis caches
  await Promise.all([
    delCache(orderHistoryKey(userId)),
    delCache(orderAllKey()),
  ]);
  console.log(`[cache] EVICT (order created) user=${userId} order=${order._id}`);

  return { skipped: false, order };
};

// ── createOrderHandler — HTTP wrapper around createOrder ──────────────────────
// POST /api/orders/  (protected by JWT)
export const createOrderHandler = asyncHandler(async (req, res) => {
  const { userId, paymentIntentId, items, address, totalAmount } = req.body;
  const result = await createOrder({ userId, paymentIntentId, items, address, totalAmount });

  if (result.skipped) {
    return res.status(200).json({ skipped: true, orderId: result.orderId });
  }
  return res.status(201).json(result.order);
});

// ── getUserOrders — GET /api/orders/myorders (cache-aside) ───────────────────
export const getUserOrders = asyncHandler(async (req, res) => {
  const cacheKey = orderHistoryKey(req.user._id);

  // 1️⃣  Cache HIT
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache] HIT  ${cacheKey}`);
    return res.json(cached);
  }

  // 2️⃣  Cache MISS → query DB
  console.log(`[cache] MISS ${cacheKey}`);
  const orders = await Order.find({ user: req.user._id })
    .populate("items.product")
    .sort({ createdAt: -1 });

  // 3️⃣  Populate cache
  await setCache(cacheKey, orders, TTL.ORDER);

  return res.json(orders);
});

// ── getAllOrders — GET /api/orders/ admin (cache-aside) ───────────────────────
export const getAllOrders = asyncHandler(async (req, res) => {
  const cacheKey = orderAllKey();

  // 1️⃣  Cache HIT
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache] HIT  ${cacheKey}`);
    return res.json(cached);
  }

  // 2️⃣  Cache MISS → query DB
  console.log(`[cache] MISS ${cacheKey}`);
  const orders = await Order.find({})
    .populate("items.product")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  // 3️⃣  Populate cache
  await setCache(cacheKey, orders, TTL.ORDER);

  return res.json(orders);
});

// ── updateOrderStatus — PUT /api/orders/:orderId/status (admin only) ─────────
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId }    = req.params;
  const { orderStatus } = req.body;

  if (!orderStatus) {
    res.status(400);
    throw new Error("orderStatus is required");
  }
  if (!VALID_STATUSES.includes(orderStatus)) {
    res.status(400);
    throw new Error(`Invalid orderStatus. Valid values: ${VALID_STATUSES.join(", ")}`);
  }

  const order = await Order.findById(orderId).populate("items.product");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const previousStatus = order.orderStatus;

  // Stock adjustment when cancelling / un-cancelling
  if (orderStatus === "cancelled" && previousStatus !== "cancelled") {
    // Restore stock — best effort (product-service manages stock, so just update order)
    console.log(`[order-service] Order ${orderId} cancelled — stock restoration should be handled by product-service`);
  } else if (previousStatus === "cancelled" && orderStatus !== "cancelled") {
    console.log(`[order-service] Order ${orderId} un-cancelled — stock deduction should be handled by product-service`);
  }

  order.orderStatus = orderStatus;
  await order.save();

  const updated = await Order.findById(order._id)
    .populate("items.product")
    .populate("user", "name email");

  // Evict all-orders cache + this user's history cache
  await Promise.all([
    delCache(orderAllKey()),
    delCache(orderHistoryKey(order.user._id || order.user)),
    delCacheByPattern(orderHistoryPattern()),
  ]);
  console.log(`[cache] EVICT (status update) orderId=${orderId} status=${orderStatus}`);

  res.json(updated);
});

// ── exportOrdersCsv — GET /api/orders/export (admin only) ────────────────────
export const exportOrdersCsv = asyncHandler(async (req, res) => {
  const { start, end } = req.query;

  const filter = {};
  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = new Date(start);
    if (end) {
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
    "Order ID", "Date", "Customer Name", "Customer Email",
    "Product Name", "Quantity", "Price", "Line Total",
    "Order Total", "Status", "Payment Status",
    "Street", "City", "State", "ZipCode", "Country",
  ];

  const rows = [];
  for (const order of orders) {
    const baseCols = [
      order._id.toString(), order.createdAt.toISOString(),
      order.user?.name || "", order.user?.email || "",
      "", "", "", "",
      order.totalAmount?.toString() || "0", order.orderStatus, order.paymentStatus,
      order.address?.street || "", order.address?.city || "",
      order.address?.state || "", order.address?.zipCode || "", order.address?.country || "",
    ];

    if (order.items.length === 0) { rows.push(baseCols); continue; }

    for (const item of order.items) {
      const price = item.price || item.product?.price || 0;
      const qty   = item.quantity || 0;
      const cols  = [...baseCols];
      cols[4] = item.product?.name  || "";
      cols[5] = qty.toString();
      cols[6] = price.toString();
      cols[7] = (price * qty).toString();
      rows.push(cols);
    }
  }

  const escapeCsv = (val) => {
    if (val == null) return "";
    const s = String(val);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="orders_export_${Date.now()}.csv"`);
  res.status(200).send(csv);
});
