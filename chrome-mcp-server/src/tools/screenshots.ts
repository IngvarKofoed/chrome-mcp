import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

export function registerScreenshotTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "screenshot",
    "Take a screenshot of the visible page area",
    {},
    async () => {
      const result = (await bridge.sendCommand("screenshot")) as {
        data: string;
        mimeType: string;
      };
      return {
        content: [
          {
            type: "image" as const,
            data: result.data,
            mimeType: result.mimeType,
          },
        ],
      };
    }
  );

  server.tool(
    "screenshot_element",
    "Take a screenshot of a specific element identified by CSS selector",
    {
      selector: z
        .string()
        .describe("CSS selector of the element to screenshot"),
    },
    async ({ selector }) => {
      const result = (await bridge.sendCommand("screenshot_element", {
        selector,
      })) as { data: string; mimeType: string };
      return {
        content: [
          {
            type: "image" as const,
            data: result.data,
            mimeType: result.mimeType,
          },
        ],
      };
    }
  );
}
