import express from "express";
import asyncHandler from "express-async-handler";
import { OpenRouter } from "@openrouter/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { protect } from "../middleware/authMiddleware.js";



const router = express.Router();

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

let client;

(async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp/mcp_server.js"]
  });

  client = new Client({
    name: "audiopro-client",
    version: "1.0.0"
  });

  await client.connect(transport);
  console.log("✅ MCP connected");
})();

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userMessage = req.body.message;
    const userId = req.user._id;
    const mcpTools = await client.listTools();
    const tools = mcpTools.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || "MCP tool",
        parameters: t.inputSchema
      }
    }));
    console.log("Available MCP tools:", tools);

    const stream = await openrouter.chat.send({
      chatRequest: {
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: `
    You are an AI shopping assistant.
    `
          },
          { role: "user", content: userMessage }
        ],
        tools
      },
      stream: true
    });
    console.log("stream:", stream);
    let fullResponse = "";
    let toolCall = null;

    const message = stream.choices[0]?.message;
    console.log("FULL MESSAGE:", JSON.stringify(message, null, 2));

    if (message?.content) {
      fullResponse = message.content;
    }

    if (message?.toolCalls) {
      toolCall = message.toolCalls[0];
    }

    if (toolCall) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      const result = await client.callTool(toolName, args, { userId });
          

      return res.json({
        type: "tool",
        tool: toolName,
        result
      });
    }

    console.log("Tool call detected:", toolCall);

    return res.json({
      type: "text",
      message: fullResponse
    });
  })
);

export default router;