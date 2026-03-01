import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

export function registerNavigationTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "navigate",
    "Navigate to a URL in the active tab",
    { url: z.string().describe("The URL to navigate to") },
    async ({ url }) => {
      const result = await bridge.sendCommand("navigate", { url });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "go_back",
    "Go back in browser history",
    {},
    async () => {
      const result = await bridge.sendCommand("go_back");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "go_forward",
    "Go forward in browser history",
    {},
    async () => {
      const result = await bridge.sendCommand("go_forward");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "reload",
    "Reload the current page",
    {},
    async () => {
      const result = await bridge.sendCommand("reload");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "get_current_url",
    "Get the URL of the active tab",
    {},
    async () => {
      const result = await bridge.sendCommand("get_current_url");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
