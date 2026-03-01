import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

export function registerPageQueryTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "query_selector",
    "Find elements matching a CSS selector and return their text and attributes",
    {
      selector: z.string().describe("CSS selector to query"),
      attributes: z
        .array(z.string())
        .optional()
        .describe(
          "List of attribute names to include in results. Defaults to common attributes (id, class, href, src, type, value)."
        ),
    },
    async ({ selector, attributes }) => {
      const result = await bridge.sendCommand("query_selector", {
        selector,
        attributes,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "evaluate_javascript",
    "Execute JavaScript in the page context and return the result",
    {
      expression: z
        .string()
        .describe("JavaScript expression to evaluate in the page context"),
    },
    async ({ expression }) => {
      const result = await bridge.sendCommand("evaluate_javascript", {
        expression,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "get_form_fields",
    "Get all form fields on the page with their current values, types, and labels",
    {},
    async () => {
      const result = await bridge.sendCommand("get_form_fields");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
