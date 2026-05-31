import express from "express";
import asyncHandler from "express-async-handler";
import { OpenRouter } from "@openrouter/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { protect } from "../middleware-service/authMiddleware.js";



const router = express.Router();

/**
 * Safely parses tool call arguments from the LLM, which may be truncated
 * (e.g., missing closing braces/brackets) due to streaming or model quirks.
 */
function safeParseToolArgs(raw) {
  if (!raw || typeof raw !== "string") return {};
  let str = raw.trim();

  // Count unmatched braces/brackets and close them
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of str) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") openBraces++;
    else if (ch === "}") openBraces--;
    else if (ch === "[") openBrackets++;
    else if (ch === "]") openBrackets--;
  }

  // Append missing closing characters
  str += "]".repeat(Math.max(0, openBrackets));
  str += "}".repeat(Math.max(0, openBraces));

  return JSON.parse(str);
}


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
      // Inject userId into args so the MCP server can access it
      // (stdio transport has no metadata passthrough)
      const args = {
        ...safeParseToolArgs(toolCall.function.arguments),
        userId: userId.toString()
      };

      console.log(`Calling MCP tool: ${toolName} with args:`, args);

      try {
        // MCP SDK v1.x: callTool(params, resultSchema?, options?)
        // 2nd arg is a Zod schema — pass undefined to skip it, use 3rd arg for options
        const resultPromise = client.callTool(
          { name: toolName, arguments: args },
          undefined,
          { timeout: 20000 }
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("MCP tool call timed out")), 20000)
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);

        return res.json({
          type: "tool",
          tool: toolName,
          result
        });
      } catch (err) {
        console.error("Error calling MCP tool:", err && err.message ? err.message : err);
        return res.status(504).json({
          type: "error",
          message: `MCP tool error: ${err.message || err}`
        });
      }
    }

    console.log("Tool call detected:", toolCall);

    return res.json({
      type: "text",
      message: fullResponse
    });
  })
);

export default router;