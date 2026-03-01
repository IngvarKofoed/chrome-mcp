# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome MCP enables AI CLI tools (Claude Code, Codex CLI, etc.) to browse the internet using the user's real Chrome session — with all cookies, logins, and extensions intact. It consists of two components connected via WebSocket:

1. **chrome-mcp-server** — A Node.js MCP server that exposes browser automation tools over SSE to AI CLI clients, and communicates with the Chrome extension via WebSocket.
2. **chrome-extension** — A Manifest V3 Chrome extension that executes browser commands using Chrome APIs and returns results through the WebSocket.

```
AI CLI ◄──SSE──► chrome-mcp-server ◄──WebSocket──► chrome-extension (in Chrome)
```

## Architecture

See `docs/ARCHITECTURE.md` for the full specification including all MCP tools, the WebSocket message protocol, and error handling strategies.

**Key architectural concerns:**
- The MCP server is the bridge: it translates MCP tool calls into WebSocket commands for the extension and returns results to clients.
- The Chrome extension only connects to `localhost` — no external communication.
- Manifest V3 service workers suspend after ~30s of inactivity. The extension must implement keepalive pings and automatic reconnection with exponential backoff.
- Every command sent to the extension must have a timeout (~30s) to prevent the AI CLI from hanging.
- Content scripts cannot be injected into restricted pages (`chrome://`, `chrome-extension://`, Chrome Web Store).

**WebSocket protocol** uses JSON messages with `id`, `command`, `params` (requests) and `id`, `success`, `data`/`error` (responses).

## Build & Run

```bash
# Server
cd chrome-mcp-server && npm install && npm run build

# Extension
cd chrome-extension && npm install && npm run build
# Then load chrome-extension/ as an unpacked extension in Chrome (manifest.json is at root, dist/ has the built JS)
```

**MCP configuration** (e.g. in Claude Code settings):
```json
{ "command": "node", "args": ["/path/to/chrome-mcp-server/dist/index.js"] }
```

The WebSocket port defaults to `7865` and can be overridden with the `CHROME_MCP_PORT` env var.

## Project Structure

- `chrome-mcp-server/src/index.ts` — MCP server entry point (StdioServerTransport + WebSocketBridge)
- `chrome-mcp-server/src/websocket-bridge.ts` — WebSocket server, pending request tracking, 30s timeout
- `chrome-mcp-server/src/tools/` — MCP tool registrations (navigation, tabs, page-content, interaction, page-query, screenshots)
- `chrome-extension/src/background.ts` — Service worker: WebSocket client, command dispatch, Chrome API handlers
- `chrome-extension/src/content.ts` — DOM functions injected on-demand via `chrome.scripting.executeScript`
