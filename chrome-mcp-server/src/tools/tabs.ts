import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

export function registerTabTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "list_tabs",
    "List all open tabs with their IDs, titles, and URLs",
    {},
    async () => {
      const result = await bridge.sendCommand("list_tabs");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "switch_tab",
    "Switch to a specific tab by its ID",
    { tabId: z.number().describe("The ID of the tab to switch to") },
    async ({ tabId }) => {
      const result = await bridge.sendCommand("switch_tab", { tabId });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "open_tab",
    "Open a new tab, optionally with a URL",
    {
      url: z
        .string()
        .optional()
        .describe("URL to open in the new tab. If omitted, opens a blank tab."),
    },
    async ({ url }) => {
      const result = await bridge.sendCommand("open_tab", { url });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "close_tab",
    "Close a tab by its ID. If no ID is given, closes the active tab.",
    {
      tabId: z
        .number()
        .optional()
        .describe("The ID of the tab to close. If omitted, closes the active tab."),
    },
    async ({ tabId }) => {
      const result = await bridge.sendCommand("close_tab", { tabId });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
