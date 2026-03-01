import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

export function registerInteractionTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "click",
    "Click an element identified by CSS selector",
    {
      selector: z.string().describe("CSS selector of the element to click"),
    },
    async ({ selector }) => {
      const result = await bridge.sendCommand("click", { selector });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "type_text",
    "Type text into an input field identified by CSS selector",
    {
      selector: z.string().describe("CSS selector of the input field"),
      text: z.string().describe("Text to type into the field"),
      clearFirst: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to clear the field before typing. Defaults to true."),
    },
    async ({ selector, text, clearFirst }) => {
      const result = await bridge.sendCommand("type_text", {
        selector,
        text,
        clearFirst,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "select_option",
    "Select an option from a dropdown by CSS selector and value",
    {
      selector: z.string().describe("CSS selector of the select element"),
      value: z.string().describe("Value of the option to select"),
    },
    async ({ selector, value }) => {
      const result = await bridge.sendCommand("select_option", {
        selector,
        value,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "scroll",
    "Scroll the page in a given direction",
    {
      direction: z
        .enum(["up", "down", "left", "right"])
        .describe("Direction to scroll"),
      amount: z
        .number()
        .optional()
        .describe("Amount to scroll in pixels. Defaults to one viewport height/width."),
    },
    async ({ direction, amount }) => {
      const result = await bridge.sendCommand("scroll", { direction, amount });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "hover",
    "Hover over an element identified by CSS selector",
    {
      selector: z.string().describe("CSS selector of the element to hover over"),
    },
    async ({ selector }) => {
      const result = await bridge.sendCommand("hover", { selector });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
