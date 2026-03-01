import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WebSocketBridge } from "../websocket-bridge.js";

const MAX_RESPONSE_LENGTH = 100_000;

function truncateIfNeeded(text: string): string {
  if (text.length > MAX_RESPONSE_LENGTH) {
    return (
      text.slice(0, MAX_RESPONSE_LENGTH) +
      `\n\n[Truncated: response exceeded ${MAX_RESPONSE_LENGTH} characters]`
    );
  }
  return text;
}

export function registerPageContentTools(
  server: McpServer,
  bridge: WebSocketBridge
): void {
  server.tool(
    "get_page_text",
    "Get the visible text content of the current page",
    {},
    async () => {
      const result = (await bridge.sendCommand("get_page_text")) as string;
      return {
        content: [{ type: "text" as const, text: truncateIfNeeded(result) }],
      };
    }
  );

  server.tool(
    "get_page_html",
    "Get the HTML of the page or a specific element",
    {
      selector: z
        .string()
        .optional()
        .describe(
          "CSS selector of the element to get HTML for. If omitted, returns the full page HTML."
        ),
    },
    async ({ selector }) => {
      const result = (await bridge.sendCommand("get_page_html", {
        selector,
      })) as string;
      return {
        content: [{ type: "text" as const, text: truncateIfNeeded(result) }],
      };
    }
  );

  server.tool(
    "get_page_title",
    "Get the title of the current page",
    {},
    async () => {
      const result = (await bridge.sendCommand("get_page_title")) as string;
      return {
        content: [{ type: "text" as const, text: result }],
      };
    }
  );

  server.tool(
    "get_links",
    "Get all links on the page with their text and URLs",
    {},
    async () => {
      const result = await bridge.sendCommand("get_links");
      return {
        content: [
          { type: "text" as const, text: truncateIfNeeded(JSON.stringify(result, null, 2)) },
        ],
      };
    }
  );

  server.tool(
    "get_headings",
    "Get the heading structure of the page (h1-h6)",
    {},
    async () => {
      const result = await bridge.sendCommand("get_headings");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
