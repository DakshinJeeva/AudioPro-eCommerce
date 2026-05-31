/**
 * mcp-service/server.js
 *
 * Wraps the MCP tool logic in a plain HTTP server on port 5004 so it can run
 * as a standalone microservice. The original stdio transport (mcp_server.js)
 * is kept intact for Claude Desktop / direct stdio clients.
 *
 * POST /tools       → list all available tools
 * POST /call        → dispatch a tool call  { name, arguments: { userId, ... } }
 * GET  /health      → health check
 */
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

dotenv.config(); // reads .env from CWD (backend/ locally, /app/ in Docker)

import {
  getCartService,
  addToCartService,
  removeFromCartService,
  updateCartItemService,
  resolveProduct,
} from "../order-service/mcp-service/cartService.js";

import {
  createOrderService,
  getUserOrdersService,
  updateOrderStatusService,
  getOrderSummaryService,
} from "../order-service/mcp-service/orderService.js";

const app  = express();
const PORT = process.env.MCP_SERVICE_PORT || 5004;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_cart",
    description: "Get the current user's cart",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "add_to_cart",
    description: "Add a product to the cart. Provide either productId or productName.",
    inputSchema: {
      type: "object",
      properties: {
        productId:   { type: "string", description: "Product ID (use this OR productName)" },
        productName: { type: "string", description: "Product name, partial match accepted" },
        quantity:    { type: "number", description: "Quantity to add (default 1)" },
      },
    },
  },
  {
    name: "remove_from_cart",
    description: "Remove a product from the cart. Provide either productId or productName.",
    inputSchema: {
      type: "object",
      properties: {
        productId:   { type: "string" },
        productName: { type: "string" },
      },
    },
  },
  {
    name: "update_cart_item",
    description: "Update the quantity of a product in the cart.",
    inputSchema: {
      type: "object",
      properties: {
        productId:   { type: "string" },
        productName: { type: "string" },
        quantity:    { type: "number", description: "New quantity (>= 1)" },
      },
      required: ["quantity"],
    },
  },
  {
    name: "get_my_orders",
    description: "Get a summary of all orders placed by the current user",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "place_order",
    description: "Place an order from the current cart.",
    inputSchema: {
      type: "object",
      properties: {
        paymentIntentId: { type: "string" },
        street:          { type: "string" },
        city:            { type: "string" },
        state:           { type: "string" },
        zipCode:         { type: "string" },
        country:         { type: "string" },
      },
    },
  },
  {
    name: "update_order_status",
    description: "Update the status of an order (admin). Valid: pending, processing, shipped, delivered, cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        orderId:     { type: "string" },
        orderStatus: { type: "string" },
      },
      required: ["orderId", "orderStatus"],
    },
  },
];

// ── GET /health ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ service: "mcp-service", status: "ok", port: PORT })
);

// ── GET /tools ────────────────────────────────────────────────────────────────
app.get("/tools", (_req, res) => res.json({ tools: TOOLS }));

// ── POST /call ────────────────────────────────────────────────────────────────
app.post("/call", async (req, res) => {
  const { name, arguments: args = {} } = req.body || {};
  const { userId, productId, productName, quantity,
          paymentIntentId, street, city, state, zipCode, country,
          orderId, orderStatus } = args;

  const msg  = (text) => ({ content: [{ type: "text", text }] });

  try {
    if (!userId) throw new Error("User not authenticated");

    switch (name) {
      // ── Cart ────────────────────────────────────────────────────────────────
      case "get_cart": {
        const cart  = await getCartService({ userId });
        const items = cart.items || [];
        if (items.length === 0) return res.json(msg("Your cart is empty."));
        const summary = items
          .map((i) => `• ${i.product?.name || "Unknown product"} × ${i.quantity}`)
          .join("\n");
        return res.json(msg(`Your cart (${items.length} item${items.length !== 1 ? "s" : ""}):\n${summary}`));
      }

      case "add_to_cart": {
        const product = await resolveProduct({ productId, productName });
        await addToCartService({ userId, productId: product._id.toString(), quantity: quantity || 1 });
        return res.json(msg(`✅ "${product.name}" added to cart.`));
      }

      case "remove_from_cart": {
        const product = await resolveProduct({ productId, productName });
        await removeFromCartService({ userId, productId: product._id.toString() });
        return res.json(msg(`🗑️ "${product.name}" removed from cart.`));
      }

      case "update_cart_item": {
        const product = await resolveProduct({ productId, productName });
        await updateCartItemService({ userId, productId: product._id.toString(), quantity });
        return res.json(msg(`✏️ "${product.name}" quantity updated to ${quantity}.`));
      }

      // ── Orders ──────────────────────────────────────────────────────────────
      case "get_my_orders": {
        const summary = await getOrderSummaryService({ userId });
        return res.json(msg(summary));
      }

      case "place_order": {
        const address = (street && city && state && zipCode && country)
          ? { street, city, state, zipCode, country }
          : null;
        const order = await createOrderService({ userId, paymentIntentId, address });
        const itemCount = order.items?.length || 0;
        return res.json(msg(
          `🎉 Order placed!\nOrder ID: ${order._id}\nItems: ${itemCount}\nTotal: ₹${order.totalAmount}\nStatus: ${order.orderStatus}`
        ));
      }

      case "update_order_status": {
        const order = await updateOrderStatusService({ orderId, orderStatus });
        return res.json(msg(`✅ Order ${order._id} status updated to "${order.orderStatus}".`));
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    // MCP spec: always 200, error surfaced as text
    return res.json(msg(err.message));
  }
});

// ── POST /api/chat ────────────────────────────────────────────────────────────
// Conversational entry-point used by the frontend ChatWidget.
// Verifies the JWT, sends the message to OpenRouter, then dispatches any
// tool call internally without a separate MCP stdio process.
app.post("/api/chat", async (req, res) => {
  // ── 1. Auth: decode JWT to get userId ──────────────────────────────────────
  let userId;
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ type: "error", message: "Not authorized, token missing" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (e) {
    return res.status(401).json({ type: "error", message: "Not authorized, token invalid" });
  }

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ type: "error", message: "message is required" });

  // ── 2. Build OpenRouter tool list from TOOLS schema ────────────────────────
  const orTools = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));

  // ── 3. Call OpenRouter ─────────────────────────────────────────────────────
  let orMessage;
  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title": "AudioPro Assistant",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are AudioPro Assistant, a helpful AI shopping assistant for an audio equipment e-commerce store. " +
              "Help users browse products, manage their cart, place orders, and track order status. " +
              "Always be friendly and concise.",
          },
          { role: "user", content: message },
        ],
        tools: orTools,
        tool_choice: "auto",
      }),
    });
    const orData = await orRes.json();
    orMessage = orData.choices?.[0]?.message;
    if (!orMessage) throw new Error(orData.error?.message || "Empty response from OpenRouter");
  } catch (err) {
    console.error("[mcp-service] OpenRouter error:", err.message);
    return res.status(502).json({ type: "error", message: `AI error: ${err.message}` });
  }

  // ── 4a. Plain text reply ───────────────────────────────────────────────────
  if (!orMessage.tool_calls?.length) {
    return res.json({ type: "text", message: orMessage.content || "" });
  }

  // ── 4b. Tool call: dispatch internally ────────────────────────────────────
  const tc = orMessage.tool_calls[0];
  const name = tc.function.name;
  let args;
  try {
    args = JSON.parse(tc.function.arguments || "{}");
  } catch {
    args = {};
  }
  args.userId = userId;

  const msg = (text) => ({ content: [{ type: "text", text }] });
  try {
    switch (name) {
      case "get_cart": {
        const cart  = await getCartService({ userId });
        const items = cart.items || [];
        if (items.length === 0) return res.json({ type: "tool", tool: name, result: msg("Your cart is empty.") });
        const summary = items.map((i) => `• ${i.product?.name || "Unknown product"} × ${i.quantity}`).join("\n");
        return res.json({ type: "tool", tool: name, result: msg(`Your cart (${items.length} item${items.length !== 1 ? "s" : ""}):\n${summary}`) });
      }
      case "add_to_cart": {
        const product = await resolveProduct({ productId: args.productId, productName: args.productName });
        await addToCartService({ userId, productId: product._id.toString(), quantity: args.quantity || 1 });
        return res.json({ type: "tool", tool: name, result: msg(`✅ "${product.name}" added to cart.`) });
      }
      case "remove_from_cart": {
        const product = await resolveProduct({ productId: args.productId, productName: args.productName });
        await removeFromCartService({ userId, productId: product._id.toString() });
        return res.json({ type: "tool", tool: name, result: msg(`🗑️ "${product.name}" removed from cart.`) });
      }
      case "update_cart_item": {
        const product = await resolveProduct({ productId: args.productId, productName: args.productName });
        await updateCartItemService({ userId, productId: product._id.toString(), quantity: args.quantity });
        return res.json({ type: "tool", tool: name, result: msg(`✏️ "${product.name}" quantity updated to ${args.quantity}.`) });
      }
      case "get_my_orders": {
        const summary = await getOrderSummaryService({ userId });
        return res.json({ type: "tool", tool: name, result: msg(summary) });
      }
      case "place_order": {
        const address = (args.street && args.city && args.state && args.zipCode && args.country)
          ? { street: args.street, city: args.city, state: args.state, zipCode: args.zipCode, country: args.country }
          : null;
        const order = await createOrderService({ userId, paymentIntentId: args.paymentIntentId, address });
        const itemCount = order.items?.length || 0;
        return res.json({ type: "tool", tool: name, result: msg(
          `🎉 Order placed!\nOrder ID: ${order._id}\nItems: ${itemCount}\nTotal: ₹${order.totalAmount}\nStatus: ${order.orderStatus}`
        )});
      }
      case "update_order_status": {
        const order = await updateOrderStatusService({ orderId: args.orderId, orderStatus: args.orderStatus });
        return res.json({ type: "tool", tool: name, result: msg(`✅ Order ${order._id} status updated to "${order.orderStatus}".`) });
      }
      default:
        return res.json({ type: "text", message: orMessage.content || `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`[mcp-service] Tool dispatch error (${name}):`, err.message);
    return res.status(500).json({ type: "error", message: err.message });
  }
});

// ── Connect & start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ [mcp-service] MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 [mcp-service] running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ [mcp-service] MongoDB connection failed:", err.message);
    process.exit(1);
  });
