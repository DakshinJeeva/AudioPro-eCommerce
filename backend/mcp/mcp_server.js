import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose";
// 👇 IMPORTANT: import schemas
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { addToCartService } from "../services/cartService.js";

// ✅ Load environment variables
dotenv.config();


await mongoose.connect(process.env.MONGO_URI);
const server = new Server(
  {
    name: "mern-ecommerce-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// 🔹 List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_to_cart",
        description: "Add product to cart",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "string" },
            quantity: { type: "number" }
          },
          required: ["productId"]
        }
      }
    ]
  };
});

// 🔹 Call tool
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "add_to_cart") {
    try {
      // userId is injected into args by the client (stdio has no metadata passthrough)
      const { productId, quantity, userId } = args;

      if (!userId) throw new Error("User not authenticated");

      await addToCartService({
        userId,
        productId,
        quantity: quantity || 1
      });

      return {
        content: [
          {
            type: "text",
            text: "Added to cart successfully"
          }
        ]
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: err.message
          }
        ]
      };
    }
  }

  throw new Error("Unknown tool");
});

// 🔹 Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.log("✅ MCP Server running");