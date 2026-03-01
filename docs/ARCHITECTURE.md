# Architecture

## Overview

This project consists of two components that work together to let AI CLI tools (such as Claude Code, Codex CLI, etc.) browse the internet using the user's real Chrome session — with all their cookies, logins, and extensions intact.

```
┌──────────────┐       SSE        ┌───────────────────┐     WebSocket     ┌────────────────────┐
│   AI CLI     │ ◄──────────────► │  chrome-mcp-server│ ◄───────────────► │  chrome-extension  │
│  (MCP client)│                  │   (MCP server)    │                   │  (runs in Chrome)  │
└──────────────┘                  └───────────────────┘                   └────────────────────┘
```

1. The **AI CLI** connects to the MCP server as a client using the MCP protocol over SSE (Server-Sent Events).
2. The **MCP server** is a long-running process that exposes MCP tools over SSE and maintains a persistent WebSocket connection to the Chrome extension.
3. The **Chrome extension** receives commands over the WebSocket, executes them in the user's browser, and returns results.

---

## chrome-mcp-server

A long-running Node.js process that acts as the bridge between AI CLI tools and the Chrome browser.

### Responsibilities

- Exposes an MCP server over SSE so AI CLI tools can discover and invoke tools.
- Maintains a persistent WebSocket connection to the Chrome extension.
- Translates incoming MCP tool calls into commands sent over the WebSocket to the extension.
- Returns results from the extension back to the MCP client.

### MCP Tools

The server exposes the following tools to MCP clients:

#### Navigation

| Tool | Description |
|------|-------------|
| `navigate` | Navigate to a URL in the active tab |
| `go_back` | Go back in browser history |
| `go_forward` | Go forward in browser history |
| `reload` | Reload the current page |
| `get_current_url` | Get the URL of the active tab |

#### Page Content

| Tool | Description |
|------|-------------|
| `get_page_text` | Get the visible text content of the page |
| `get_page_html` | Get the HTML of the page or a specific element |
| `get_page_title` | Get the title of the current page |
| `get_links` | Get all links on the page with their text and URLs |
| `get_headings` | Get the heading structure of the page |

#### Interaction

| Tool | Description |
|------|-------------|
| `click` | Click an element identified by CSS selector |
| `type_text` | Type text into an input field |
| `select_option` | Select an option from a dropdown |
| `scroll` | Scroll the page in a given direction |
| `hover` | Hover over an element |

#### Screenshots

| Tool | Description |
|------|-------------|
| `screenshot` | Take a screenshot of the visible page |
| `screenshot_element` | Take a screenshot of a specific element |

#### Tab Management

| Tool | Description |
|------|-------------|
| `list_tabs` | List all open tabs |
| `switch_tab` | Switch to a specific tab |
| `open_tab` | Open a new tab |
| `close_tab` | Close a tab |

#### Page Query

| Tool | Description |
|------|-------------|
| `query_selector` | Find elements matching a CSS selector and return their text/attributes |
| `evaluate_javascript` | Execute JavaScript in the page context and return the result |
| `get_form_fields` | Get all form fields on the page with their current values |

---

## chrome-extension

A Chrome extension (Manifest V3) that runs in the user's browser and executes commands on behalf of the MCP server.

### Responsibilities

- Establishes and maintains a WebSocket connection to the MCP server.
- Listens for commands from the server and executes them against the browser using Chrome extension APIs.
- Returns results (page content, screenshots, success/failure) back through the WebSocket.
- Runs with the user's existing session — cookies, logins, and browser state are all available.

### Key Design Points

- Uses a **service worker** (background script) to manage the WebSocket connection and coordinate with content scripts.
- Injects **content scripts** into pages as needed to read the DOM, click elements, fill forms, etc.
- Uses Chrome APIs (`chrome.tabs`, `chrome.scripting`, `chrome.debugger`, etc.) for tab management and screenshots.
- The extension only connects to `localhost` — it does not communicate with any external servers.

### Service Worker Lifecycle (Manifest V3)

Chrome's Manifest V3 service workers are **not persistent** — Chrome can suspend them after ~30 seconds of inactivity. This directly affects the WebSocket connection. The extension must handle this:

- **Keepalive:** Send periodic ping/pong messages over the WebSocket to prevent Chrome from suspending the service worker while the MCP server is connected.
- **Reconnection:** If the service worker is suspended and the WebSocket drops, the extension must automatically re-establish the connection when it wakes up. The MCP server should also detect disconnects and accept reconnections.
- **In-flight commands:** If a command is in progress when the connection drops, the MCP server should time it out and return an error to the AI CLI rather than hanging indefinitely.

### Permissions

The extension requires the following Chrome permissions:

- `activeTab` — access to the currently active tab
- `tabs` — list and manage tabs
- `scripting` — inject content scripts into pages
- `<all_urls>` — interact with pages on any domain
- `debugger` (optional) — for advanced interaction and screenshots via the Chrome DevTools Protocol

---

## Communication Protocol

The WebSocket connection between the MCP server and the Chrome extension uses a simple JSON message protocol.

### Request (server → extension)

```json
{
  "id": "unique-request-id",
  "command": "navigate",
  "params": {
    "url": "https://example.com"
  }
}
```

### Response (extension → server)

```json
{
  "id": "unique-request-id",
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain"
  }
}
```

### Error Response

```json
{
  "id": "unique-request-id",
  "success": false,
  "error": "Tab not found"
}
```

---

## Error Handling and Resilience

Both the MCP server and the Chrome extension must handle failures gracefully since the browser is an inherently unpredictable environment.

### WebSocket Disconnects

- The MCP server runs a WebSocket server that the extension connects to.
- If the connection drops (extension suspended, browser closed, network issue), the server should mark the extension as disconnected and return errors for any incoming MCP tool calls until the extension reconnects.
- The extension should attempt to reconnect automatically with exponential backoff.

### Command Timeouts

- Every command sent to the extension has a timeout (e.g. 30 seconds). If the extension does not respond in time, the server returns a timeout error to the AI CLI.
- This prevents the AI CLI from hanging indefinitely when a page is slow, unresponsive, or the extension has been suspended.

### Tab and Page Errors

- **Tab closed mid-command:** If the target tab is closed while a command is running, the extension should detect this and return an error.
- **Navigation during command:** If the page navigates away while a DOM query or interaction is in progress, the extension should return an error rather than returning stale or partial results.
- **Restricted pages:** Some pages (`chrome://`, `chrome-extension://`, Chrome Web Store) do not allow content script injection. The extension should return a clear error for these cases.
