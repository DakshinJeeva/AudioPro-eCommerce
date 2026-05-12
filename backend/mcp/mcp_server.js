import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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



// 🚀 Start Server
async function start() {

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("MCP Server running...");
}

start();