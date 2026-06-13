// backend/controllers/orderController.js
import asyncHandler from "express-async-handler";
import {
  createOrderService,
  getUserOrdersService,
  getAllOrdersService,
  updateOrderStatusService,
} from "../mcp-service/orderService.js";
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
// audiopro:order:history:<userId>   → order list for one user
// audiopro:order:all                → full order list (admin)
const orderHistoryKey = (userId) => buildKey("order", "history", String(userId));
const orderAllKey     = ()       => buildKey("order", "all");
const orderHistoryPattern = ()   => buildKey("order", "history", "*");

// Create order from cart after payment success
export const createOrder = asyncHandler(async (req, res) => {
  const order = await createOrderService({
    userId: req.user._id,
    paymentIntentId: req.body.paymentIntentId,
    address: req.body.address,
  });

  // Invalidate this user's cached history + the admin all-orders cache
  await Promise.all([
    delCache(orderHistoryKey(req.user._id)),
    delCache(orderAllKey()),
  ]);
  console.log(`[cache] EVICT (new order) user=${req.user._id}`);

  res.status(201).json(order);
});

// Get all orders for authenticated user  (cache-aside)
export const getUserOrders = asyncHandler(async (req, res) => {
  const cacheKey = orderHistoryKey(req.user._id);

  // 1️⃣  Cache HIT
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache] HIT  ${cacheKey}`);
    return res.json(cached);
  }

  // 2️⃣  Cache MISS → query service/DB
  console.log(`[cache] MISS ${cacheKey}`);
  const orders = await getUserOrdersService({ userId: req.user._id });

  // 3️⃣  Populate cache
  await setCache(cacheKey, orders, TTL.ORDER);

  return res.json(orders);
});

// Get all orders (admin only)  (cache-aside)
export const getAllOrders = asyncHandler(async (req, res) => {
  const cacheKey = orderAllKey();

  // 1️⃣  Cache HIT
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache] HIT  ${cacheKey}`);
    return res.json(cached);
  }

  // 2️⃣  Cache MISS → query service/DB
  console.log(`[cache] MISS ${cacheKey}`);
  const orders = await getAllOrdersService();

  // 3️⃣  Populate cache
  await setCache(cacheKey, orders, TTL.ORDER);

  return res.json(orders);
});

// Update order status (admin only)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatusService({
    orderId: req.params.orderId,
    orderStatus: req.body.orderStatus,
  });

  // Evict all-orders cache + every user's history cache
  // (we don't know which user owns this order without an extra DB lookup)
  await Promise.all([
    delCache(orderAllKey()),
    delCacheByPattern(orderHistoryPattern()),
  ]);
  console.log(`[cache] EVICT (status update) orderId=${req.params.orderId}`);

  res.json(order);
});

// Export orders as CSV for a given date range (admin only)
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
      const qty = item.quantity || 0;
      const cols = [...baseCols];
      cols[4] = item.product?.name || "";
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

  const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="orders_export_${Date.now()}.csv"`);
  res.status(200).send(csv);
});
