import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { addToCartService } from "../services/cartService.js";

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

server.tool(
  "add_to_cart",
  {
    productId: { type: "string" },
    quantity: { type: "number" }
  },
  async ({ productId, quantity }, context) => {
    try {
      const userId = context.userId;

      await addToCartService({
        userId,
        productId,
        quantity
      });

      return {
        content: [{ type: "text", text: "Added to cart" }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: err.message }]
      };
    }
  }
);

// 🚀 Start Server
async function start() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("MCP Server running...");
}

start();
