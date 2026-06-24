/**
 * mcp-service/mcp_server.js
 *
 * MCP stdio transport server — used by Claude Desktop / direct stdio clients.
 * All data access goes through downstream service APIs (no Mongoose coupling).
 *
 * The token is expected to be injected into each tool call's `arguments` as
 * `{ token: "<jwt>", … }` by the MCP client (e.g. openAI_mcp_client.js).
 */
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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

dotenv.config();

const server = new Server(
  { name: "audiopro-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── Cart ──────────────────────────────────────────────────────────────
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
          productId:   { type: "string", description: "Product ID (use this OR productName)" },
          productName: { type: "string", description: "Product name, partial match accepted" },
        },
      },
    },
    {
      name: "update_cart_item",
      description: "Update the quantity of a product in the cart. Provide either productId or productName.",
      inputSchema: {
        type: "object",
        properties: {
          productId:   { type: "string", description: "Product ID (use this OR productName)" },
          productName: { type: "string", description: "Product name, partial match accepted" },
          quantity:    { type: "number", description: "New quantity (must be >= 1)" },
        },
        required: ["quantity"],
      },
    },

    // ── Orders ─────────────────────────────────────────────────────────────
    {
      name: "get_my_orders",
      description: "Get a summary of all orders placed by the current user",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "place_order",
      description:
        "Place an order from the current cart. Uses the user's saved address if none is provided.",
      inputSchema: {
        type: "object",
        properties: {
          paymentIntentId: { type: "string", description: "Stripe payment intent ID" },
          street:          { type: "string", description: "Street address" },
          city:            { type: "string", description: "City" },
          state:           { type: "string", description: "State" },
          zipCode:         { type: "string", description: "ZIP / postal code" },
          country:         { type: "string", description: "Country" },
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
          orderId:     { type: "string", description: "Order ID to update" },
          orderStatus: {
            type: "string",
            description: "New status: pending | processing | shipped | delivered | cancelled",
          },
        },
        required: ["orderId", "orderStatus"],
      },
    },
  ],
}));

// ─── Tool dispatch ────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  // The MCP client injects `token` (JWT) into every tool-call argument map.
  const {
    token,
    productId, productName, quantity,
    paymentIntentId, street, city, state, zipCode, country,
    orderId, orderStatus,
  } = args;

  const msg  = (text) => ({ content: [{ type: "text", text }] });
  const fail = (text) => ({ content: [{ type: "text", text }] });

  try {
    if (!token) throw new Error("No auth token provided — client must inject token into args");

    switch (name) {
      // ── Cart ──────────────────────────────────────────────────────────────
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

      // ── Orders ────────────────────────────────────────────────────────────
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
          `🎉 Order placed successfully!\nOrder ID: ${order._id}\nItems: ${itemCount}\nTotal: ₹${order.totalAmount}\nStatus: ${order.orderStatus}`
        );
      }

      case "update_order_status": {
        const order = await updateOrderStatusService({ token, orderId, orderStatus });
        return msg(`✅ Order ${order._id} status updated to "${order.orderStatus}".`);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err.message);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("✅ [mcp_server] stdio transport running");