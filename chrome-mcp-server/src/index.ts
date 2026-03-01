import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebSocketBridge } from "./websocket-bridge.js";
import { registerNavigationTools } from "./tools/navigation.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerPageContentTools } from "./tools/page-content.js";
import { registerInteractionTools } from "./tools/interaction.js";
import { registerPageQueryTools } from "./tools/page-query.js";
import { registerScreenshotTools } from "./tools/screenshots.js";

const port = parseInt(process.env.CHROME_MCP_PORT ?? "7865", 10);
const bridge = new WebSocketBridge(port);

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

async function main() {
  bridge.start();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[chrome-mcp] MCP server running on stdio");

  const shutdown = () => {
    console.error("[chrome-mcp] Shutting down...");
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
