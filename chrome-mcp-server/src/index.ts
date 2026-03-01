import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { WebSocketBridge } from "./websocket-bridge.js";
import { registerNavigationTools } from "./tools/navigation.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerPageContentTools } from "./tools/page-content.js";
import { registerInteractionTools } from "./tools/interaction.js";
import { registerPageQueryTools } from "./tools/page-query.js";
import { registerScreenshotTools } from "./tools/screenshots.js";

function createMcpServer(bridge: WebSocketBridge): McpServer {
  const server = new McpServer({
    name: "chrome-mcp",
    version: "1.0.0",
  });

  registerNavigationTools(server, bridge);
  registerTabTools(server, bridge);
  registerPageContentTools(server, bridge);
  registerInteractionTools(server, bridge);
  registerPageQueryTools(server, bridge);
  registerScreenshotTools(server, bridge);

  return server;
}

const wsPort = parseInt(process.env.CHROME_MCP_PORT ?? "7865", 10);
const httpPort = parseInt(process.env.CHROME_MCP_HTTP_PORT ?? "7864", 10);

const bridge = new WebSocketBridge(wsPort);
const app = createMcpExpressApp();

const transports: Record<string, StreamableHTTPServerTransport> = {};

app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          console.error(`[chrome-mcp] MCP session initialized: ${sid}`);
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.error(`[chrome-mcp] MCP session closed: ${sid}`);
          delete transports[sid];
        }
      };

      const server = createMcpServer(bridge);
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[chrome-mcp] Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

async function main() {
  bridge.start();

  app.listen(httpPort, () => {
    console.error(`[chrome-mcp] MCP HTTP server listening on http://127.0.0.1:${httpPort}/mcp`);
    console.error(`[chrome-mcp] WebSocket bridge listening on ws://127.0.0.1:${wsPort}`);
  });

  const shutdown = async () => {
    console.error("[chrome-mcp] Shutting down...");
    for (const sid of Object.keys(transports)) {
      try {
        await transports[sid].close();
        delete transports[sid];
      } catch {
        // ignore cleanup errors
      }
    }
    bridge.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[chrome-mcp] Fatal error:", err);
  process.exit(1);
});
