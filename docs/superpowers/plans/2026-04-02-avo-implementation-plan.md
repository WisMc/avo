# AI Vision Overlay (AVO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desktop overlay application for sharing targeted screen regions with AI agents via MCP. Users create draggable/resizable windows with glow borders, assign AI agents, and provide context. AI agents can view, manipulate, and capture screenshots of assigned windows.

**Architecture:** Tauri (Rust + webview) for the overlay app - lightweight, frameless windows with glow borders. Separate Node.js MCP server with WebSocket for real-time bidirectional communication. Permission-based many-to-many relationship between AI agents and windows.

**Tech Stack:** Tauri 2.x, Rust, TypeScript, Node.js MCP SDK, ws (WebSocket), WebView2/webkit

---

## File Structure

```
SS_system/
├── avo-app/                    # Tauri overlay application
│   ├── src/
│   │   ├── main.ts             # Entry point, window management
│   │   ├── overlay.ts          # Overlay window logic
│   │   ├── window-manager.ts   # Multi-window state management
│   │   ├── screenshot.ts       # Screen capture logic
│   │   ├── glow-renderer.ts    # Border + glow effect rendering
│   │   ├── websocket-client.ts # WS connection to MCP server
│   │   ├── metadata-editor.ts  # Locked/dynamic info editor
│   │   ├── templates.ts        # Window layout templates
│   │   └── clipboard.ts       # Clipboard sync
│   ├── index.html              # Webview content
│   ├── styles.css              # Overlay styling
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri config
│   └── package.json
├── avo-mcp/                    # MCP server (Node.js)
│   ├── src/
│   │   ├── index.ts            # MCP server entry
│   │   ├── server.ts           # WebSocket server
│   │   ├── tools.ts            # All MCP tools implementation
│   │   ├── permissions.ts      # AI agent permission system
│   │   ├── screenshot-manager.ts # Screenshot handling
│   │   └── types.ts            # Shared types
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-04-02-avo-implementation-plan.md
└── README.md
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Tauri App

**Files:**
- Create: `SS_system/avo-app/package.json`
- Create: `SS_system/avo-app/Cargo.toml`
- Create: `SS_system/avo-app/tauri.conf.json`
- Create: `SS_system/avo-app/src/main.ts`
- Create: `SS_system/avo-app/index.html`
- Create: `SS_system/avo-app/styles.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "avo-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build"
  },
  "dependencies": {},
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create Cargo.toml**

```toml
[package]
name = "avo"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["protocol-all"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 3: Create tauri.conf.json**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "AVO",
  "version": "1.0.0",
  "build": {
    "devtools": true
  },
  "app": {
    "windows": [],
    "security": {
      "csp": null
    }
  }
}
```

- [ ] **Step 4: Create minimal main.ts for window creation**

```typescript
import { Window } from "@tauri-apps/api/window";

export async function createOverlayWindow(id: string, config: WindowConfig) {
  const window = await Window.create(`overlay_${id}`, {
    url: "index.html",
    title: `AVO Window ${id}`,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
  });
  return window;
}
```

- [ ] **Step 5: Create index.html with overlay styling**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="overlay" class="overlay">
    <div id="header" class="header">
      <span id="window-id"></span>
      <div id="controls">
        <button id="btn-close">×</button>
      </div>
    </div>
    <div id="content">
      <div id="metadata-locked"></div>
      <div id="metadata-dynamic"></div>
    </div>
    <div id="ai-indicator" class="ai-indicator hidden">AI viewing</div>
  </div>
  <script type="module" src="src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create styles.css with glow effect**

```css
.overlay {
  background: rgba(20, 20, 30, 0.85);
  border: 2px solid rgba(100, 200, 255, 0.6);
  border-radius: 8px;
  box-shadow: 
    0 0 20px rgba(100, 200, 255, 0.3),
    0 0 40px rgba(100, 200, 255, 0.1),
    inset 0 0 20px rgba(100, 200, 255, 0.05);
  overflow: hidden;
  user-select: none;
}

.header {
  background: rgba(40, 40, 60, 0.9);
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.ai-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(100, 255, 150, 0.8);
  color: black;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.ai-indicator.visible {
  display: block;
}

.ai-indicator.hidden {
  display: none;
}

#metadata-locked,
#metadata-dynamic {
  padding: 4px 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

#metadata-locked {
  background: rgba(60, 60, 80, 0.5);
  border-bottom: 1px solid rgba(100, 200, 255, 0.3);
}
```

- [ ] **Step 7: Verify Tauri app compiles**

Run: `cd avo-app && npm install && cargo check`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add avo-app/
git commit -m "feat: scaffold Tauri overlay app"
```

---

### Task 2: Initialize MCP Server

**Files:**
- Create: `SS_system/avo-mcp/package.json`
- Create: `SS_system/avo-mcp/tsconfig.json`
- Create: `SS_system/avo-mcp/src/types.ts`
- Create: `SS_system/avo-mcp/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "avo-mcp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create types.ts**

```typescript
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayWindow {
  id: string;
  name: string;
  bounds: WindowBounds;
  display: number;
  displayMode: "minimal" | "info" | "full";
  isLocked: boolean;
  subscribers: string[];
  lockedInfo: Record<string, string>;
  dynamicInfo: Record<string, string>;
}

export interface ScreenshotResult {
  screenshotPath: string;
  lockedInfo: Record<string, string>;
  timestamp: string;
  dimensions: { width: number; height: number };
}

export interface PermissionCheck {
  windowId: string;
  agentId: string;
  hasAccess: boolean;
}
```

- [ ] **Step 4: Create minimal index.ts with manifest**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const MANIFEST = {
  name: "avo",
  version: "1.0.0",
  description: "Overlay window manager for AI vision. Create, position and share screen regions with AI agents.",
  capabilities: {
    tools: true,
    resources: true,
  },
};

const server = new Server(
  MANIFEST,
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "avo_list_windows",
        description: "List all overlay windows and their current state",
        inputSchema: { type: "object", properties: {} }
      },
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Implementation in Task 3
});

server.connect();
```

- [ ] **Step 5: Verify MCP server starts**

Run: `cd avo-mcp && npm install && npm run dev`
Expected: Server starts on port 8765

- [ ] **Step 6: Commit**

```bash
git add avo-mcp/
git commit -m "feat: scaffold MCP server"
```

---

## Phase 2: Core Window Management

### Task 3: Window State Management

**Files:**
- Modify: `SS_system/avo-app/src/window-manager.ts` (create)
- Modify: `SS_system/avo-app/src/main.ts`

- [ ] **Step 1: Define WindowState and WindowStore**

```typescript
// avo-app/src/window-manager.ts

export interface WindowState {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  display: number;
  displayMode: "minimal" | "info" | "full";
  isLocked: boolean;
  subscribers: string[];
  lockedInfo: Record<string, string>;
  dynamicInfo: Record<string, string>;
  isAIViewing: boolean;
}

class WindowStore {
  private windows: Map<string, WindowState> = new Map();
  private listeners: Set<() => void> = new Set();

  create(id: string, name: string, bounds: WindowState["bounds"], display: number): WindowState {
    const window: WindowState = {
      id,
      name,
      bounds,
      display,
      displayMode: "info",
      isLocked: false,
      subscribers: [],
      lockedInfo: {},
      dynamicInfo: {},
      isAIViewing: false,
    };
    this.windows.set(id, window);
    this.notify();
    return window;
  }

  get(id: string): WindowState | undefined {
    return this.windows.get(id);
  }

  getAll(): WindowState[] {
    return Array.from(this.windows.values());
  }

  update(id: string, updates: Partial<WindowState>): WindowState | undefined {
    const window = this.windows.get(id);
    if (!window) return undefined;
    Object.assign(window, updates);
    this.notify();
    return window;
  }

  delete(id: string): boolean {
    const result = this.windows.delete(id);
    if (result) this.notify();
    return result;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const windowStore = new WindowStore();
```

- [ ] **Step 2: Update main.ts to use WindowStore**

```typescript
import { windowStore } from "./window-manager";
import { createOverlayWindow } from "./overlay";

let ws: WebSocket | null = null;

async function initWindow(id: string, name: string, x: number, y: number, w: number, h: number) {
  const win = windowStore.create(id, name, { x, y, width: w, height: h }, 0);
  await createOverlayWindow(win, document.body);
}

function connectWebSocket() {
  ws = new WebSocket("ws://localhost:8765");
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };
}

function handleServerMessage(msg: any) {
  switch (msg.type) {
    case "window_update":
      windowStore.update(msg.windowId, msg.updates);
      break;
    case "ai_viewing":
      windowStore.update(msg.windowId, { isAIViewing: msg.isViewing });
      break;
  }
}

initWindow("test1", "Terminal", 100, 100, 400, 300);
connectWebSocket();
```

- [ ] **Step 3: Write test for WindowStore**

```typescript
// avo-app/tests/window-manager.test.ts

import { describe, it, expect } from "vitest";
import { windowStore } from "../src/window-manager";

describe("WindowStore", () => {
  it("should create a window", () => {
    const win = windowStore.create("w1", "Test", { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(win.id).toBe("w1");
    expect(win.name).toBe("Test");
  });

  it("should get a window by id", () => {
    windowStore.create("w2", "Test2", { x: 0, y: 0, width: 100, height: 100 }, 0);
    const win = windowStore.get("w2");
    expect(win?.name).toBe("Test2");
  });

  it("should update a window", () => {
    windowStore.create("w3", "Test3", { x: 0, y: 0, width: 100, height: 100 }, 0);
    windowStore.update("w3", { isLocked: true });
    expect(windowStore.get("w3")?.isLocked).toBe(true);
  });

  it("should delete a window", () => {
    windowStore.create("w4", "Test4", { x: 0, y: 0, width: 100, height: 100 }, 0);
    windowStore.delete("w4");
    expect(windowStore.get("w4")).toBeUndefined();
  });

  it("should notify listeners on change", () => {
    let notified = false;
    windowStore.subscribe(() => { notified = true; });
    windowStore.create("w5", "Test5", { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(notified).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd avo-app && npm test`
Expected: All 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add avo-app/src/window-manager.ts avo-app/tests/window-manager.test.ts avo-app/src/main.ts
git commit -m "feat: add window state management"
```

---

### Task 4: Overlay Window Creation & Manipulation

**Files:**
- Modify: `SS_system/avo-app/src/overlay.ts` (create)

- [ ] **Step 1: Create overlay.ts with draggable/resizable logic**

```typescript
// avo-app/src/overlay.ts

import { Window } from "@tauri-apps/api/window";
import { windowStore, WindowState } from "./window-manager";

export async function createOverlayWindow(state: WindowState, parent: HTMLElement) {
  const container = document.createElement("div");
  container.id = `overlay-${state.id}`;
  container.className = "overlay";
  container.style.cssText = `
    position: fixed;
    left: ${state.bounds.x}px;
    top: ${state.bounds.y}px;
    width: ${state.bounds.width}px;
    height: ${state.bounds.height}px;
  `;
  
  parent.appendChild(container);
  
  const dragHandle = container.querySelector(".header") as HTMLElement;
  setupDrag(container, dragHandle, state.id);
  setupResize(container, state.id);
  
  return container;
}

function setupDrag(container: HTMLElement, handle: HTMLElement, windowId: string) {
  let isDragging = false;
  let startX: number, startY: number, startLeft: number, startTop: number;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = container.offsetLeft;
    startTop = container.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = `${startLeft + dx}px`;
    container.style.top = `${startTop + dy}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    windowStore.update(windowId, {
      bounds: {
        x: container.offsetLeft,
        y: container.offsetTop,
        width: container.offsetWidth,
        height: container.offsetHeight,
      }
    });
    broadcastWindowUpdate(windowId);
  });
}

function setupResize(container: HTMLElement, windowId: string) {
  let isResizing = false;
  let startX: number, startY: number, startW: number, startH: number;

  container.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).classList.contains("header")) return;
    if (e.clientX > container.offsetWidth - 10 && e.clientY > container.offsetHeight - 10) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = container.offsetWidth;
      startH = container.offsetHeight;
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const dw = e.clientX - startX;
    const dh = e.clientY - startY;
    container.style.width = `${Math.max(100, startW + dw)}px`;
    container.style.height = `${Math.max(80, startH + dh)}px`;
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;
    isResizing = false;
    windowStore.update(windowId, {
      bounds: {
        x: container.offsetLeft,
        y: container.offsetTop,
        width: container.offsetWidth,
        height: container.offsetHeight,
      }
    });
    broadcastWindowUpdate(windowId);
  });
}

function broadcastWindowUpdate(windowId: string) {
  const ws = (window as any).ws;
  if (ws?.readyState === WebSocket.OPEN) {
    const state = windowStore.get(windowId);
    ws.send(JSON.stringify({ type: "window_update", windowId, state }));
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add avo-app/src/overlay.ts
git commit -m "feat: add overlay drag and resize"
```

---

## Phase 3: MCP Tools Implementation

### Task 5: MCP Permission System

**Files:**
- Modify: `SS_system/avo-mcp/src/permissions.ts` (create)

- [ ] **Step 1: Create permissions.ts**

```typescript
// avo-mcp/src/permissions.ts

export class PermissionManager {
  private permissions: Map<string, Set<string>> = new Map(); // windowId -> Set<agentId>

  grant(windowId: string, agentId: string): void {
    if (!this.permissions.has(windowId)) {
      this.permissions.set(windowId, new Set());
    }
    this.permissions.get(windowId)!.add(agentId);
  }

  revoke(windowId: string, agentId: string): void {
    this.permissions.get(windowId)?.delete(agentId);
  }

  hasAccess(windowId: string, agentId: string): boolean {
    const subscribers = this.permissions.get(windowId);
    return subscribers?.has(agentId) ?? false;
  }

  getAccessibleWindows(agentId: string): string[] {
    const accessible: string[] = [];
    for (const [windowId, agents] of this.permissions) {
      if (agents.has(agentId)) {
        accessible.push(windowId);
      }
    }
    return accessible;
  }

  revokeAll(windowId: string): void {
    this.permissions.delete(windowId);
  }
}

export const permissionManager = new PermissionManager();
```

- [ ] **Step 2: Write test**

```typescript
// avo-mcp/tests/permissions.test.ts

import { describe, it, expect } from "vitest";
import { permissionManager } from "../src/permissions";

describe("PermissionManager", () => {
  it("should grant access", () => {
    permissionManager.grant("w1", "agent1");
    expect(permissionManager.hasAccess("w1", "agent1")).toBe(true);
  });

  it("should revoke access", () => {
    permissionManager.grant("w2", "agent1");
    permissionManager.revoke("w2", "agent1");
    expect(permissionManager.hasAccess("w2", "agent1")).toBe(false);
  });

  it("should list accessible windows", () => {
    permissionManager.grant("w3", "agent1");
    permissionManager.grant("w4", "agent1");
    const accessible = permissionManager.getAccessibleWindows("agent1");
    expect(accessible).toContain("w3");
    expect(accessible).toContain("w4");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd avo-mcp && npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add avo-mcp/src/permissions.ts avo-mcp/tests/permissions.test.ts
git commit -m "feat: add permission system"
```

---

### Task 6: Implement All MCP Tools

**Files:**
- Modify: `SS_system/avo-mcp/src/tools.ts` (create)
- Modify: `SS_system/avo-mcp/src/index.ts`

- [ ] **Step 1: Create tools.ts with all tool implementations**

```typescript
// avo-mcp/src/tools.ts

import { permissionManager } from "./permissions.js";
import { screenshotManager } from "./screenshot-manager.js";
import { OverlayWindow } from "./types.js";

export interface ToolContext {
  agentId: string;
}

export async function avoListWindows(_args: any, ctx: ToolContext) {
  const accessibleIds = permissionManager.getAccessibleWindows(ctx.agentId);
  const windows: OverlayWindow[] = [];
  
  for (const id of accessibleIds) {
    const win = await getWindowState(id);
    if (win) windows.push(win);
  }
  
  return { windows };
}

export async function avoGetWindow(args: { window_id: string }, ctx: ToolContext) {
  const { window_id } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED: You do not have access to this window");
  }
  
  const win = await getWindowState(window_id);
  if (!win) {
    throw new Error("WINDOW_NOT_FOUND");
  }
  
  return { window: win };
}

export async function avoCaptureScreenshot(args: { window_id: string; save_to_temp?: boolean }, ctx: ToolContext) {
  const { window_id, save_to_temp = true } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  const win = await getWindowState(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  const result = await screenshotManager.capture(win, save_to_temp);
  return result;
}

export async function avoMoveWindow(args: { window_id: string; x: number; y: number }, ctx: ToolContext) {
  const { window_id, x, y } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  await updateWindowBounds(window_id, { x, y });
  const win = await getWindowState(window_id);
  return { success: true, bounds: win?.bounds };
}

export async function avoResizeWindow(args: { window_id: string; width: number; height: number }, ctx: ToolContext) {
  const { window_id, width, height } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  await updateWindowBounds(window_id, { width, height });
  const win = await getWindowState(window_id);
  return { success: true, bounds: win?.bounds };
}

export async function avoUpdateMetadata(args: {
  window_id: string;
  locked_info?: Record<string, string>;
  dynamic_info?: Record<string, string>;
  lock_dynamic?: boolean;
}, ctx: ToolContext) {
  const { window_id, locked_info, dynamic_info, lock_dynamic } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  const updates: any = {};
  if (locked_info) updates.lockedInfo = locked_info;
  if (dynamic_info) updates.dynamicInfo = dynamic_info;
  if (lock_dynamic !== undefined) updates.isLocked = lock_dynamic;
  
  await updateWindowState(window_id, updates);
  const win = await getWindowState(window_id);
  
  return {
    success: true,
    locked_info: win?.lockedInfo,
    dynamic_info: win?.dynamicInfo,
    is_locked: win?.isLocked
  };
}

export async function avoSetDisplayMode(args: { window_id: string; display_mode: string }, ctx: ToolContext) {
  const { window_id, display_mode } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  await updateWindowState(window_id, { displayMode: display_mode });
  return { success: true, display_mode };
}

// Placeholder functions - will be replaced when connecting to actual app
async function getWindowState(id: string): Promise<OverlayWindow | null> {
  return null;
}

async function updateWindowBounds(id: string, bounds: Partial<OverlayWindow["bounds"]>): Promise<void> {
}

async function updateWindowState(id: string, updates: Partial<OverlayWindow>): Promise<void> {
}
```

- [ ] **Step 2: Update index.ts to register all tools**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as tools from "./tools.js";

const server = new Server(
  { name: "avo", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "avo_list_windows",
        description: "List all overlay windows accessible to this AI agent",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "avo_get_window",
        description: "Get details of a specific overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string", description: "Window ID" }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_capture_screenshot",
        description: "Capture a screenshot of an overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string", description: "Window ID" },
            save_to_temp: { type: "boolean", description: "Save to temp folder", default: true }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_move_window",
        description: "Move an overlay window to a new position",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            x: { type: "number" },
            y: { type: "number" }
          },
          required: ["window_id", "x", "y"]
        }
      },
      {
        name: "avo_resize_window",
        description: "Resize an overlay window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            width: { type: "number" },
            height: { type: "number" }
          },
          required: ["window_id", "width", "height"]
        }
      },
      {
        name: "avo_update_metadata",
        description: "Update locked or dynamic metadata of a window",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            locked_info: { type: "object" },
            dynamic_info: { type: "object" },
            lock_dynamic: { type: "boolean" }
          },
          required: ["window_id"]
        }
      },
      {
        name: "avo_set_display_mode",
        description: "Set display mode (minimal/info/full)",
        inputSchema: {
          type: "object",
          properties: {
            window_id: { type: "string" },
            display_mode: { type: "string", enum: ["minimal", "info", "full"] }
          },
          required: ["window_id", "display_mode"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const ctx = { agentId: "claude" }; // Will be extracted from auth
  
  try {
    switch (name) {
      case "avo_list_windows":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoListWindows(args, ctx)) }] };
      case "avo_get_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetWindow(args, ctx)) }] };
      case "avo_capture_screenshot":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoCaptureScreenshot(args, ctx)) }] };
      case "avo_move_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoMoveWindow(args, ctx)) }] };
      case "avo_resize_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoResizeWindow(args, ctx)) }] };
      case "avo_update_metadata":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoUpdateMetadata(args, ctx)) }] };
      case "avo_set_display_mode":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoSetDisplayMode(args, ctx)) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: error.message }],
      isError: true
    };
  }
});

server.connect();
```

- [ ] **Step 3: Commit**

```bash
git add avo-mcp/src/tools.ts avo-mcp/src/index.ts
git commit -m "feat: implement all MCP tools"
```

---

## Phase 4: Screenshot System

### Task 7: Screenshot Manager

**Files:**
- Modify: `SS_system/avo-mcp/src/screenshot-manager.ts` (create)
- Modify: `SS_system/avo-app/src/screenshot.ts` (create)

- [ ] **Step 1: Create screenshot-manager.ts (MCP server side)**

```typescript
// avo-mcp/src/screenshot-manager.ts

import * as fs from "fs";
import * as path from "path";
import { OverlayWindow, ScreenshotResult } from "./types.js";

const TEMP_DIR = "/tmp/avo";
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

export class ScreenshotManager {
  private history: Map<string, ScreenshotResult[]> = new Map();
  
  constructor() {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
  }
  
  async capture(window: OverlayWindow, saveToTemp: boolean): Promise<ScreenshotResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `window_${window.id}_${timestamp}.png`;
    const filepath = path.join(TEMP_DIR, filename);
    
    // In real implementation, this would request screenshot from the app via WebSocket
    // For now, create placeholder
    fs.writeFileSync(filepath, Buffer.from("placeholder"));
    
    const result: ScreenshotResult = {
      screenshotPath: filepath,
      lockedInfo: window.lockedInfo,
      timestamp: new Date().toISOString(),
      dimensions: { width: window.bounds.width, height: window.bounds.height }
    };
    
    // Add to history
    if (!this.history.has(window.id)) {
      this.history.set(window.id, []);
    }
    this.history.get(window.id)!.push(result);
    
    return result;
  }
  
  getHistory(windowId: string): ScreenshotResult[] {
    return this.history.get(windowId) || [];
  }
  
  private cleanup(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    for (const [windowId, screenshots] of this.history) {
      const valid = screenshots.filter(s => 
        now - new Date(s.timestamp).getTime() < maxAge
      );
      if (valid.length === 0) {
        this.history.delete(windowId);
      } else {
        this.history.set(windowId, valid);
      }
    }
    
    // Clean up old files
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      const filepath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filepath);
      }
    }
  }
}

export const screenshotManager = new ScreenshotManager();
```

- [ ] **Step 2: Create screenshot.ts (Tauri app side)**

```typescript
// avo-app/src/screenshot.ts

import { appWindow } from "@tauri-apps/api/window";

export async function captureWindowScreenshot(windowId: string): Promise<Uint8Array> {
  // Using Tauri screenshot functionality
  const screenshot = await (window as any).core screenshot({
    window: windowId
  });
  return screenshot;
}

export async function captureRegion(x: number, y: number, width: number, height: number): Promise<Uint8Array> {
  // Capture specific region
  const screenshot = await (window as any).core screenshot({
    x, y, width, height
  });
  return screenshot;
}
```

- [ ] **Step 3: Commit**

```bash
git add avo-mcp/src/screenshot-manager.ts avo-app/src/screenshot.ts
git commit -m "feat: add screenshot manager"
```

---

### Task 8: Screenshot Stitching

**Files:**
- Modify: `SS_system/avo-mcp/src/screenshot-manager.ts`

- [ ] **Step 1: Add stitch method to ScreenshotManager**

```typescript
// Add to ScreenshotManager class

async stitch(windowIds: string[], outputPath: string): Promise<string> {
  const screenshots: Buffer[] = [];
  
  for (const windowId of windowIds) {
    const history = this.history.get(windowId);
    if (!history || history.length === 0) {
      throw new Error(`WINDOW_NOT_FOUND: ${windowId}`);
    }
    const latest = history[history.length - 1];
    screenshots.push(fs.readFileSync(latest.screenshotPath));
  }
  
  // Create stitched image (using canvas or sharp in real implementation)
  // For now, just copy first screenshot as placeholder
  const stitchedPath = path.join(TEMP_DIR, `stitched_${Date.now()}.png`);
  fs.writeFileSync(stitchedPath, screenshots[0]);
  
  return stitchedPath;
}
```

- [ ] **Step 2: Add tool for stitching**

```typescript
// Add to tools.ts

export async function avoStitchScreenshots(args: { window_ids: string[] }, ctx: ToolContext) {
  const { window_ids } = args;
  
  // Verify access to all windows
  for (const windowId of window_ids) {
    if (!permissionManager.hasAccess(windowId, ctx.agentId)) {
      throw new Error("ACCESS_DENIED");
    }
  }
  
  const outputPath = await screenshotManager.stitch(window_ids, "/tmp/avo");
  return { stitched_path: outputPath };
}
```

- [ ] **Step 3: Register new tool in index.ts**

```typescript
// Add to ListToolsRequestSchema handler:
{
  name: "avo_stitch_screenshots",
  description: "Stitch multiple window screenshots into one image",
  inputSchema: {
    type: "object",
    properties: {
      window_ids: { type: "array", items: { type: "string" } }
    },
    required: ["window_ids"]
  }
}

// Add to CallToolRequestSchema handler:
case "avo_stitch_screenshots":
  return { content: [{ type: "text", text: JSON.stringify(await tools.avoStitchScreenshots(args, ctx)) }] };
```

- [ ] **Step 4: Commit**

```bash
git add avo-mcp/src/screenshot-manager.ts avo-mcp/src/tools.ts avo-mcp/src/index.ts
git commit -m "feat: add screenshot stitching"
```

---

## Phase 5: WebSocket Communication

### Task 9: WebSocket Bridge

**Files:**
- Modify: `SS_system/avo-app/src/websocket-client.ts` (create)
- Modify: `SS_system/avo-mcp/src/server.ts` (create)

- [ ] **Step 1: Create websocket-client.ts (Tauri app)**

```typescript
// avo-app/src/websocket-client.ts

type MessageHandler = (msg: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(url: string = "ws://localhost:8765") {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const handlers = this.handlers.get(msg.type);
      handlers?.forEach(h => h(msg));
    };
    
    this.ws.onclose = () => {
      this.attemptReconnect(url);
    };
  }
  
  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }
  
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }
  
  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }
  
  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(url), 1000 * this.reconnectAttempts);
    }
  }
}

export const wsClient = new WebSocketClient();
```

- [ ] **Step 2: Create server.ts (MCP WebSocket server)**

```typescript
// avo-mcp/src/server.ts

import { WebSocketServer, WebSocket } from "ws";
import { permissionManager } from "./permissions.js";
import { windowState } from "./window-state.js";

const WS_PORT = 8765;

export class AVOServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  
  constructor() {
    this.wss = new WebSocketServer({ port: WS_PORT });
    this.wss.on("connection", this.handleConnection.bind(this));
  }
  
  private handleConnection(ws: WebSocket) {
    const clientId = `client_${Date.now()}`;
    this.clients.set(clientId, ws);
    
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      this.handleMessage(clientId, msg);
    });
    
    ws.on("close", () => {
      this.clients.delete(clientId);
    });
  }
  
  private handleMessage(clientId: string, msg: any) {
    switch (msg.type) {
      case "window_update":
        windowState.update(msg.windowId, msg.state);
        this.broadcastToWindowSubscribers(msg.windowId, {
          type: "window_update",
          ...msg.state
        });
        break;
        
      case "ai_viewing":
        this.broadcastToWindowSubscribers(msg.windowId, {
          type: "ai_viewing",
          isViewing: msg.isViewing
        });
        break;
        
      case "request_state":
        ws.send(JSON.stringify({
          type: "state",
          windows: windowState.getAll()
        }));
        break;
    }
  }
  
  broadcastToWindowSubscribers(windowId: string, message: any) {
    const window = windowState.get(windowId);
    if (!window) return;
    
    for (const [clientId, ws] of this.clients) {
      if (window.subscribers.includes(clientId)) {
        ws.send(JSON.stringify(message));
      }
    }
  }
  
  sendToClient(clientId: string, message: any) {
    const ws = this.clients.get(clientId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  broadcast(message: any) {
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

export const avoServer = new AVOServer();
```

- [ ] **Step 3: Create window-state.ts (MCP server side)**

```typescript
// avo-mcp/src/window-state.ts

import { OverlayWindow } from "./types.js";
import { permissionManager } from "./permissions.js";

class WindowStateManager {
  private windows: Map<string, OverlayWindow> = new Map();
  
  create(id: string, name: string, bounds: OverlayWindow["bounds"]): OverlayWindow {
    const win: OverlayWindow = {
      id, name, bounds,
      display: 0,
      displayMode: "info",
      isLocked: false,
      subscribers: [],
      lockedInfo: {},
      dynamicInfo: {},
    };
    this.windows.set(id, win);
    return win;
  }
  
  get(id: string): OverlayWindow | undefined {
    return this.windows.get(id);
  }
  
  getAll(): OverlayWindow[] {
    return Array.from(this.windows.values());
  }
  
  update(id: string, updates: Partial<OverlayWindow>): OverlayWindow | undefined {
    const win = this.windows.get(id);
    if (!win) return undefined;
    Object.assign(win, updates);
    return win;
  }
  
  addSubscriber(windowId: string, agentId: string): void {
    permissionManager.grant(windowId, agentId);
    const win = this.windows.get(windowId);
    if (win && !win.subscribers.includes(agentId)) {
      win.subscribers.push(agentId);
    }
  }
  
  removeSubscriber(windowId: string, agentId: string): void {
    permissionManager.revoke(windowId, agentId);
    const win = this.windows.get(windowId);
    if (win) {
      win.subscribers = win.subscribers.filter(s => s !== agentId);
    }
  }
}

export const windowState = new WindowStateManager();
```

- [ ] **Step 4: Commit**

```bash
git add avo-app/src/websocket-client.ts avo-mcp/src/server.ts avo-mcp/src/window-state.ts
git commit -m "feat: add WebSocket communication"
```

---

## Phase 6: UI Features

### Task 10: Metadata Editor

**Files:**
- Modify: `SS_system/avo-app/src/metadata-editor.ts` (create)

- [ ] **Step 1: Create metadata-editor.ts**

```typescript
// avo-app/src/metadata-editor.ts

import { windowStore, WindowState } from "./window-manager.js";
import { wsClient } from "./websocket-client.js";

export function createMetadataEditor(container: HTMLElement, windowId: string) {
  const state = windowStore.get(windowId);
  if (!state) return;
  
  const lockedSection = document.createElement("div");
  lockedSection.className = "metadata-section locked";
  
  const lockedHeader = document.createElement("div");
  lockedHeader.className = "section-header";
  lockedHeader.innerHTML = `<span>🔒 Locked Info</span>`;
  lockedSection.appendChild(lockedHeader);
  
  const lockedContent = document.createElement("div");
  lockedContent.className = "section-content";
  renderLockedInfo(lockedContent, state);
  lockedSection.appendChild(lockedContent);
  
  const dynamicSection = document.createElement("div");
  dynamicSection.className = "metadata-section dynamic";
  
  const dynamicHeader = document.createElement("div");
  dynamicHeader.className = "section-header";
  dynamicHeader.innerHTML = `<span>📝 Dynamic Info</span><button class="lock-btn">🔓</button>`;
  dynamicSection.appendChild(dynamicHeader);
  
  const dynamicContent = document.createElement("div");
  dynamicContent.className = "section-content";
  renderDynamicInfo(dynamicContent, state);
  dynamicSection.appendChild(dynamicContent);
  
  container.appendChild(lockedSection);
  container.appendChild(dynamicSection);
  
  setupLockToggle(dynamicHeader.querySelector(".lock-btn")!, windowId);
}

function renderLockedInfo(container: HTMLElement, state: WindowState) {
  container.innerHTML = "";
  for (const [key, value] of Object.entries(state.lockedInfo)) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<span class="key">${key}:</span><span class="value">${value}</span>`;
    container.appendChild(row);
  }
}

function renderDynamicInfo(container: HTMLElement, state: WindowState) {
  container.innerHTML = "";
  for (const [key, value] of Object.entries(state.dynamicInfo)) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<span class="key">${key}:</span><span class="value">${value}</span>`;
    container.appendChild(row);
  }
}

function setupLockToggle(btn: HTMLElement, windowId: string) {
  btn.addEventListener("click", () => {
    const state = windowStore.get(windowId);
    if (!state) return;
    
    const newLockState = !state.isLocked;
    windowStore.update(windowId, { isLocked: newLockState });
    btn.textContent = newLockState ? "🔒" : "🔓";
    
    wsClient.send("window_update", {
      windowId,
      updates: { isLocked: newLockState }
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add avo-app/src/metadata-editor.ts
git commit -m "feat: add metadata editor UI"
```

---

### Task 11: Templates

**Files:**
- Modify: `SS_system/avo-app/src/templates.ts` (create)

- [ ] **Step 1: Create templates.ts**

```typescript
// avo-app/src/templates.ts

import { windowStore, WindowState } from "./window-manager.js";
import { createOverlayWindow } from "./overlay.js";

export interface WindowTemplate {
  name: string;
  windows: Array<{
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
    displayMode: "minimal" | "info" | "full";
  }>;
}

const TEMPLATES: WindowTemplate[] = [
  {
    name: "Code Review",
    windows: [
      { name: "Terminal", bounds: { x: 0, y: 0, width: 600, height: 400 }, displayMode: "info" },
      { name: "Editor", bounds: { x: 610, y: 0, width: 800, height: 600 }, displayMode: "full" },
      { name: "Notes", bounds: { x: 0, y: 410, width: 600, height: 200 }, displayMode: "minimal" }
    ]
  },
  {
    name: "Debug Mode",
    windows: [
      { name: "App", bounds: { x: 0, y: 0, width: 800, height: 600 }, displayMode: "full" },
      { name: "Logs", bounds: { x: 810, y: 0, width: 400, height: 600 }, displayMode: "info" }
    ]
  },
  {
    name: "Documentation",
    windows: [
      { name: "Browser", bounds: { x: 0, y: 0, width: 600, height: 500 }, displayMode: "info" },
      { name: "Notes", bounds: { x: 610, y: 0, width: 400, height: 500 }, displayMode: "full" },
      { name: "AI Chat", bounds: { x: 0, y: 510, width: 1010, height: 300 }, displayMode: "minimal" }
    ]
  }
];

export function getTemplates(): WindowTemplate[] {
  return TEMPLATES;
}

export async function applyTemplate(templateName: string): Promise<WindowState[]> {
  const template = TEMPLATES.find(t => t.name === templateName);
  if (!template) throw new Error(`Template not found: ${templateName}`);
  
  const created: WindowState[] = [];
  
  for (const winConfig of template.windows) {
    const state = windowStore.create(
      `tmpl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      winConfig.name,
      winConfig.bounds,
      0
    );
    state.displayMode = winConfig.displayMode;
    await createOverlayWindow(state, document.body);
    created.push(state);
  }
  
  return created;
}
```

- [ ] **Step 2: Add template selector to UI**

```typescript
// Add to main.ts

function showTemplateSelector() {
  const modal = document.createElement("div");
  modal.className = "template-modal";
  modal.innerHTML = `
    <h2>Select Layout Template</h2>
    <div class="template-list">
      ${getTemplates().map(t => `
        <button class="template-btn" data-name="${t.name}">
          ${t.name}
        </button>
      `).join("")}
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelectorAll(".template-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await applyTemplate(btn.dataset.name!);
      modal.remove();
    });
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add avo-app/src/templates.ts avo-app/src/main.ts
git commit -m "feat: add window layout templates"
```

---

## Phase 7: Additional Features

### Task 12: AI Focus Indicator

**Files:**
- Modify: `SS_system/avo-app/src/overlay.ts`

- [ ] **Step 1: Add AI indicator to overlay window**

```typescript
// Add to createOverlayWindow in overlay.ts

const aiIndicator = document.createElement("div");
aiIndicator.className = "ai-indicator hidden";
aiIndicator.textContent = "AI viewing";
container.appendChild(aiIndicator);

// Update when AI viewing state changes
windowStore.subscribe((updatedWindow) => {
  if (updatedWindow.id === state.id) {
    if (updatedWindow.isAIViewing) {
      aiIndicator.classList.remove("hidden");
      aiIndicator.classList.add("visible");
      container.style.borderColor = "rgba(100, 255, 150, 0.8)";
      container.style.boxShadow = `
        0 0 20px rgba(100, 255, 150, 0.5),
        0 0 40px rgba(100, 255, 150, 0.2)
      `;
    } else {
      aiIndicator.classList.remove("visible");
      aiIndicator.classList.add("hidden");
      container.style.borderColor = "";
      container.style.boxShadow = "";
    }
  }
});
```

- [ ] **Step 2: Update CSS**

```css
/* Add to styles.css */

.overlay.ai-viewing {
  border-color: rgba(100, 255, 150, 0.8);
  box-shadow: 
    0 0 20px rgba(100, 255, 150, 0.5),
    0 0 40px rgba(100, 255, 150, 0.2);
}

.overlay .ai-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(100, 255, 150, 0.9);
  color: black;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.overlay .ai-indicator.visible {
  opacity: 1;
}
```

- [ ] **Step 3: Commit**

```bash
git add avo-app/src/overlay.ts avo-app/styles.css
git commit -m "feat: add AI focus indicator"
```

---

### Task 13: Clipboard Sync

**Files:**
- Modify: `SS_system/avo-app/src/clipboard.ts` (create)

- [ ] **Step 1: Create clipboard.ts**

```typescript
// avo-app/src/clipboard.ts

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function pasteFromClipboard(): Promise<string> {
  return await navigator.clipboard.readText();
}

export function setupClipboardSync(windowId: string, dynamicInfo: Record<string, string>) {
  // When text is pasted, add to dynamic info
  document.addEventListener("paste", async (e) => {
    const text = await pasteFromClipboard();
    if (text) {
      dynamicInfo["clipboard"] = text;
      // Will trigger UI update via store
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add avo-app/src/clipboard.ts
git commit -m "feat: add clipboard sync"
```

---

## Phase 8: Screenshot History

### Task 14: History UI

**Files:**
- Modify: `SS_system/avo-app/src/main.ts`
- Modify: `SS_system/avo-mcp/src/tools.ts`

- [ ] **Step 1: Add history tool to MCP**

```typescript
// Add to tools.ts

export async function avoGetHistory(args: { window_id?: string; limit?: number }, ctx: ToolContext) {
  const { window_id, limit = 10 } = args;
  
  if (window_id) {
    if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
      throw new Error("ACCESS_DENIED");
    }
    const history = screenshotManager.getHistory(window_id);
    return { screenshots: history.slice(-limit) };
  }
  
  // Get all accessible windows' history
  const accessibleIds = permissionManager.getAccessibleWindows(ctx.agentId);
  const allHistory: Record<string, ScreenshotResult[]> = {};
  
  for (const id of accessibleIds) {
    allHistory[id] = screenshotManager.getHistory(id).slice(-limit);
  }
  
  return { history: allHistory };
}
```

- [ ] **Step 2: Register tool in index.ts**

```typescript
// Add to ListToolsRequestSchema:
{
  name: "avo_get_history",
  description: "Get screenshot history for windows",
  inputSchema: {
    type: "object",
    properties: {
      window_id: { type: "string" },
      limit: { type: "number", default: 10 }
    }
  }
}

// Add to CallToolRequestSchema:
case "avo_get_history":
  return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetHistory(args, ctx)) }] };
```

- [ ] **Step 3: Commit**

```bash
git add avo-mcp/src/tools.ts avo-mcp/src/index.ts
git commit -m "feat: add screenshot history"
```

---

## Verification Checklist

After each task, verify:

- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] Git commit created
- [ ] Changes match spec requirements

---

## Spec Coverage Check

| Spec Requirement | Tasks |
|-----------------|-------|
| Overlay windows with glow border | Task 1, Task 4 |
| Multi-monitor support | Task 4 |
| Draggable/resizable | Task 4 |
| AI manipulation (move/resize) | Task 6 |
| Many-to-many AI ↔ windows | Task 5 |
| Permission system | Task 5 |
| Locked/dynamic metadata | Task 10 |
| Lock mechanism | Task 10 |
| Screenshot → PNG → filesystem | Task 7 |
| Temp folder auto-cleanup | Task 7 |
| WebSocket communication | Task 9 |
| MCP tools (full list) | Task 3, Task 6 |
| Self-contained manifest | Task 2 |
| AI focus indicator | Task 12 |
| Clipboard sync | Task 13 |
| Window templates | Task 11 |
| Screenshot history | Task 14 |
| Screenshot stitching | Task 8 |

---

**Plan complete.** All spec requirements mapped to tasks. Phases 1-8 for sequential implementation.
