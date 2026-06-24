/**
 * mcp-service/server.js
 *
 * Standalone HTTP microservice on port 5004.
 * All data access goes through downstream service APIs — no Mongoose / DB coupling.
 *
 * POST /tools       → list all available tools
 * POST /call        → dispatch a tool call  { name, arguments: { … } }
 * POST /api/chat    → conversational entry-point (OpenRouter + tool dispatch)
 * GET  /health      → health check
 */
import express from "express";
import cors    from "cors";
import morgan  from "morgan";
import dotenv  from "dotenv";
import jwt     from "jsonwebtoken";

dotenv.config();

// ── Decoupled service clients ─────────────────────────────────────────────────
import {
  resolveProduct,
  getCartService,
  addToCartService,
  removeFromCartService,
  updateCartItemService,
} from "./services/cartService.js";

import {
  createOrderService,
  updateOrderStatusService,
  getOrderSummaryService,
} from "./services/orderService.js";

// ── App setup ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.MCP_SERVICE_PORT || 5004;

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
    description: "Place an order from the current cart. Uses the user's saved address if none is provided.",
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
    description:
      "Update the status of an order (admin). Valid: pending, processing, shipped, delivered, cancelled.",
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

// ── Auth helper ───────────────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT in the Authorization header.
 * Returns { userId, token } on success, throws on failure.
 */
function verifyAuth(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw Object.assign(new Error("Not authorized, token missing"), { status: 401 });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.id, token };
  } catch {
    throw Object.assign(new Error("Not authorized, token invalid"), { status: 401 });
  }
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────
/**
 * Central tool-call handler used by both POST /call and POST /api/chat.
 * Returns a plain MCP-style content object: { content: [{ type, text }] }
 */
async function dispatchTool(name, args, token) {
  const { productId, productName, quantity,
          paymentIntentId, street, city, state, zipCode, country,
          orderId, orderStatus } = args;

  const msg = (text) => ({ content: [{ type: "text", text }] });

  switch (name) {
    // ── Cart ─────────────────────────────────────────────────────────────────
    case "get_cart": {
      const cart  = await getCartService({ token });
      const items = cart.items || [];
      if (items.length === 0) return msg("Your cart is empty.");
      const summary = items
        .map((i) => `• ${i.product?.name || "Unknown product"} × ${i.quantity}`)
        .join("\n");
      return msg(
        `Your cart (${items.length} item${items.length !== 1 ? "s" : ""}):\n${summary}`
      );
    }

    case "add_to_cart": {
      const product = await resolveProduct({ productId, productName });
      await addToCartService({ token, productId: product._id.toString(), quantity: quantity || 1 });
      return msg(`✅ "${product.name}" added to cart.`);
    }

    case "remove_from_cart": {
      const product = await resolveProduct({ productId, productName });
      await removeFromCartService({ token, productId: product._id.toString() });
      return msg(`🗑️ "${product.name}" removed from cart.`);
    }

    case "update_cart_item": {
      const product = await resolveProduct({ productId, productName });
      await updateCartItemService({ token, productId: product._id.toString(), quantity });
      return msg(`✏️ "${product.name}" quantity updated to ${quantity}.`);
    }

    // ── Orders ───────────────────────────────────────────────────────────────
    case "get_my_orders": {
      const summary = await getOrderSummaryService({ token });
      return msg(summary);
    }

    case "place_order": {
      const address =
        street && city && state && zipCode && country
          ? { street, city, state, zipCode, country }
          : null;
      const order     = await createOrderService({ token, paymentIntentId, address });
      const itemCount = order.items?.length || 0;
      return msg(
        `🎉 Order placed!\nOrder ID: ${order._id}\nItems: ${itemCount}\nTotal: ₹${order.totalAmount}\nStatus: ${order.orderStatus}`
      );
    }

    case "update_order_status": {
      const order = await updateOrderStatusService({ token, orderId, orderStatus });
      return msg(`✅ Order ${order._id} status updated to "${order.orderStatus}".`);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /health
app.get("/health", (_req, res) =>
  res.json({ service: "mcp-service", status: "ok", port: PORT })
);

// GET /tools
app.get("/tools", (_req, res) => res.json({ tools: TOOLS }));

// POST /call  — low-level MCP tool dispatch (requires userId in args)
app.post("/call", async (req, res) => {
  const { name, arguments: args = {} } = req.body || {};

  let token;
  try {
    ({ token } = verifyAuth(req));
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  try {
    const result = await dispatchTool(name, args, token);
    return res.json(result);
  } catch (err) {
    // MCP spec: always 200, error surfaced as text content
    return res.json({ content: [{ type: "text", text: err.message }] });
  }
});

// POST /api/chat  — conversational entry-point used by the frontend ChatWidget
app.post("/api/chat", async (req, res) => {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  let token;
  try {
    ({ token } = verifyAuth(req));
  } catch (err) {
    return res.status(err.status || 401).json({ type: "error", message: err.message });
  }

  const { message } = req.body || {};
  if (!message)
    return res.status(400).json({ type: "error", message: "message is required" });

  // ── 2. Build OpenRouter tool list ─────────────────────────────────────────
  const orTools = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));

  // ── 3. Call OpenRouter ────────────────────────────────────────────────────
  let orMessage;
  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":  process.env.FRONTEND_URL || "http://localhost:5173",
        "X-Title":       "AudioPro Assistant",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are AudioPro Assistant, a helpful AI shopping assistant for an audio equipment " +
              "e-commerce store. Help users browse products, manage their cart, place orders, and " +
              "track order status. Always be friendly and concise.",
          },
          { role: "user", content: message },
        ],
        tools:       orTools,
        tool_choice: "auto",
      }),
    });
    const orData = await orRes.json();
    orMessage = orData.choices?.[0]?.message;
    if (!orMessage)
      throw new Error(orData.error?.message || "Empty response from OpenRouter");
  } catch (err) {
    console.error("[mcp-service] OpenRouter error:", err.message);
    return res.status(502).json({ type: "error", message: `AI error: ${err.message}` });
  }

  // ── 4a. Plain text reply ──────────────────────────────────────────────────
  if (!orMessage.tool_calls?.length) {
    return res.json({ type: "text", message: orMessage.content || "" });
  }

  // ── 4b. Tool call: dispatch internally ────────────────────────────────────
  const tc   = orMessage.tool_calls[0];
  const name = tc.function.name;
  let args;
  try {
    args = JSON.parse(tc.function.arguments || "{}");
  } catch {
    args = {};
  }

  try {
    const result = await dispatchTool(name, args, token);
    return res.json({ type: "tool", tool: name, result });
  } catch (err) {
    console.error(`[mcp-service] Tool dispatch error (${name}):`, err.message);
    return res.status(500).json({ type: "error", message: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`🚀 [mcp-service] running on http://localhost:${PORT}`)
);
