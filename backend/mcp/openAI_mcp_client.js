import express from "express";
import asyncHandler from "express-async-handler";
import { OpenRouter } from "@openrouter/sdk";
import { ClientSession } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const router = express.Router();

// 🔹 OpenRouter setup
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

// 🔹 Create MCP session (start once)
const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp_server.js"]
});

const session = new ClientSession(transport);
await session.connect();

// 🔹 MAIN AI API
router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const userMessage = req.body.message;
    const userId = req.user._id;

    // 🔹 Get MCP tools
    const mcpTools = await session.listTools();

    const tools = mcpTools.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || "MCP tool",
        parameters: t.inputSchema
      }
    }));

    // 🔹 Call OpenRouter
    const stream = await openrouter.chat.send({
      model: "openai/gpt-oss-120b:free",
      messages: [
        { role: "user", content: userMessage }
      ],
      tools,
      stream: true
    });

    let fullResponse = "";
    let toolCall = null;

    // 🔹 Read stream
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullResponse += delta.content;
      }

      if (delta?.tool_calls) {
        toolCall = delta.tool_calls[0];
      }
    }

    if (toolCall) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      const result = await session.callTool(
        toolName,
        args,
        { userId }
      );

      return res.json({
        type: "tool",
        tool: toolName,
        result
      });
    }

    return res.json({
      type: "text",
      message: fullResponse
    });
  })
);

export default router;
