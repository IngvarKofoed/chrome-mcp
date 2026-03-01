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

## Current State

This is a greenfield project. The architecture is fully specified in `docs/ARCHITECTURE.md` but no source code has been implemented yet. The `chrome-mcp-server/` and `chrome-extension/` directories are empty and awaiting implementation.
