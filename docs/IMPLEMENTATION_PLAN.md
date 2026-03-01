# Implementation Plan: chrome-mcp v1

## Overview

This plan implements both components of chrome-mcp — an MCP server and a Chrome extension — that together let AI CLI tools browse the web using the user's real Chrome session. Implementation proceeds in 7 phases, each building on the previous.

## Phase Dependencies

```
Phase 1 (WebSocket)
  └─► Phase 2 (MCP + Navigation)
        ├─► Phase 3 (Tabs + Content)
        │     ├─► Phase 4 (Interaction)
        │     └─► Phase 5 (Query + JS)
        ├─► Phase 6 (Screenshots)
        └─► Phase 7 (Polish)
```

## Technology Choices

- **MCP Server:** TypeScript, `@modelcontextprotocol/sdk` with `StdioServerTransport`, `ws` for WebSocket server, `zod` for input schemas
- **Chrome Extension:** TypeScript compiled with `esbuild`, Manifest V3, no framework
- **Transport:** Stdio (how Claude Code natively spawns MCP servers)

---

## Phase 1: Skeleton + WebSocket Communication

**Goal:** Two processes talking over WebSocket. No MCP tools yet — just prove the communication layer.

### chrome-mcp-server/
- `package.json` — deps: `ws`, `uuid`, `typescript`, `@types/ws`, `@types/node`
- `tsconfig.json` — target ES2022, module Node16, outDir dist
- `src/types.ts` — `WebSocketRequest`, `WebSocketResponse` interfaces
- `src/websocket-bridge.ts` — WebSocket server on port 7865, `sendCommand()` with 30s timeout, pending request Map
- `src/index.ts` — Creates WebSocketBridge, starts it, logs status

### chrome-extension/
- `manifest.json` — MV3 with permissions: activeTab, tabs, scripting; host_permissions: `<all_urls>`
- `package.json` — deps: typescript, esbuild
- `tsconfig.json` — target ES2022, module ES2022, outDir dist
- `src/types.ts` — Same protocol types as server
- `src/background.ts` — WebSocket client to `ws://localhost:7865`, exponential backoff reconnect (1s→30s), keepalive ping every 20s

---

## Phase 2: MCP Server + Navigation Tools

**Goal:** Wire up MCP SDK so AI CLI tools can discover and call navigation tools end-to-end.

### chrome-mcp-server/
- Add deps: `@modelcontextprotocol/sdk`, `zod`
- `src/index.ts` — Create `McpServer`, register tools, connect `StdioServerTransport`
- `src/tools/navigation.ts` — navigate, go_back, go_forward, reload, get_current_url

### chrome-extension/
- `src/background.ts` — Add handlers: navigate → `chrome.tabs.update` + wait for load; go_back/go_forward/reload via chrome.tabs API; get_current_url via `chrome.tabs.query`

---

## Phase 3: Tab Management + Page Content

**Goal:** Add tab management and page content extraction via content script injection.

### chrome-mcp-server/
- `src/tools/tabs.ts` — list_tabs, switch_tab, open_tab, close_tab
- `src/tools/page-content.ts` — get_page_text, get_page_html, get_page_title, get_links, get_headings

### chrome-extension/
- `src/background.ts` — Tab handlers via `chrome.tabs` API; page content via `chrome.scripting.executeScript`
- `src/content.ts` — DOM extraction functions injected on-demand (not persistent content scripts)
- Restricted page detection for `chrome://`, `chrome-extension://`, Chrome Web Store

---

## Phase 4: DOM Interaction

**Goal:** Click, type, select, scroll, hover.

### chrome-mcp-server/
- `src/tools/interaction.ts` — click, type_text, select_option, scroll, hover

### chrome-extension/
- `src/content.ts` — clickElement, typeText (with proper input/change events for React/Vue), selectOption, scrollPage, hoverElement

---

## Phase 5: Page Query + JS Evaluation

**Goal:** CSS selector queries, arbitrary JS execution, form field inspection.

### chrome-mcp-server/
- `src/tools/page-query.ts` — query_selector, evaluate_javascript, get_form_fields

### chrome-extension/
- `src/content.ts` — querySelectorAll with result limit (50), evaluateJs, getFormFields

---

## Phase 6: Screenshots

**Goal:** Visible page and element screenshots.

### chrome-mcp-server/
- `src/tools/screenshots.ts` — screenshot, screenshot_element returning base64 PNG

### chrome-extension/
- `src/background.ts` — `chrome.tabs.captureVisibleTab` for full page; bounding rect + crop via OffscreenCanvas for elements

---

## Phase 7: Robustness + Polish

**Goal:** Harden error handling, improve developer experience.

- Validate extension is connected before sending commands
- Tab-closed-mid-command detection
- Navigation-during-command detection
- Truncate large responses to avoid overwhelming LLM context
- Configurable port via `CHROME_MCP_PORT` env var
- Build scripts (`build`, `start`, `dev`)
- Graceful shutdown
- Extension badge icon showing connection status

---

## Verification

After each phase, test by:
1. `cd chrome-mcp-server && npm run build`
2. `cd chrome-extension && npm run build`, then load `chrome-extension/dist/` as unpacked extension
3. For Phase 2+: configure Claude Code MCP settings and invoke the tools through conversation
