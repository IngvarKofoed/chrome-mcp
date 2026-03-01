# Chrome MCP

Chrome MCP lets AI CLI tools (Claude Code, Codex CLI, etc.) browse the internet using your real Chrome session — with all your cookies, logins, and extensions intact.

## Why?

Existing browser automation options don't work well for AI CLI tools:

- **Claude's built-in browser tool** only works in the web UI — it's not available when Claude is invoked via CLI or API.
- **Playwright and similar automation frameworks** launch browsers in developer/automation mode, which many websites detect and block.

Chrome MCP solves both problems by driving your normal Chrome browser directly. The AI browses as you — same session, same cookies, no automation flags.

> **Warning:** This gives the AI access to your real Chrome profile — your cookies, saved logins, and active sessions. The AI can navigate to any site you're already logged into and interact with it on your behalf. Only use this with AI tools you trust, and review what the AI is doing in your browser.

It consists of two components connected via WebSocket:

```
AI CLI  <--MCP/HTTP-->  chrome-mcp-server  <--WebSocket-->  Chrome extension
```

## Prerequisites

- Node.js 18+
- Google Chrome

## Build

```bash
# Clone the repo
git clone https://github.com/IngvarKofoed/chrome-mcp.git
cd chrome-mcp

# Build the MCP server
cd chrome-mcp-server
npm install
npm run build

# Build the Chrome extension
cd ../chrome-extension
npm install
npm run build
```

## Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension/` directory (the one containing `manifest.json`)

The extension icon should appear in your toolbar. It connects to the local MCP server automatically — no configuration needed.

## Run the MCP Server

```bash
cd chrome-mcp-server
npm start
```

This starts:
- An HTTP server on port **7864** (MCP endpoint at `/mcp`)
- A WebSocket server on port **7865** (for the Chrome extension)

Both ports can be overridden with environment variables:

```bash
CHROME_MCP_HTTP_PORT=8080 CHROME_MCP_PORT=8081 npm start
```

## Configure Your AI CLI

### Claude Code

Add to your MCP settings (`.claude/settings.json` or project settings):

```json
{
  "mcpServers": {
    "chrome-mcp": {
      "url": "http://127.0.0.1:7864/mcp"
    }
  }
}
```

### Other MCP Clients

Point any MCP-compatible client at `http://127.0.0.1:7864/mcp` using the Streamable HTTP transport.

## Available Tools

Once connected, the AI gets access to these browser automation tools:

| Category | Tools |
|----------|-------|
| **Navigation** | `navigate`, `go_back`, `go_forward`, `reload`, `get_current_url` |
| **Page Content** | `get_page_text`, `get_page_html`, `get_page_title`, `get_links`, `get_headings` |
| **Interaction** | `click`, `type_text`, `select_option`, `scroll`, `hover` |
| **Screenshots** | `screenshot`, `screenshot_element` |
| **Tabs** | `list_tabs`, `switch_tab`, `open_tab`, `close_tab` |
| **Page Query** | `query_selector`, `evaluate_javascript`, `get_form_fields` |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full specification including the WebSocket message protocol, error handling, and service worker lifecycle details.

## Troubleshooting

**"Chrome extension is not connected"** — Make sure Chrome is open and the extension is loaded. Check that the WebSocket port matches (default 7865).

**Tools fail on certain pages** — Content scripts cannot be injected into `chrome://`, `chrome-extension://`, or Chrome Web Store pages. This is a Chrome security restriction.

**Extension disconnects** — Manifest V3 service workers can suspend after ~30s of inactivity. The extension reconnects automatically, but in-flight commands will time out.
