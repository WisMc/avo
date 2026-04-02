import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebSocketServer, WebSocket } from "ws";
import * as tools from "./tools.js";
import { windowState } from "./window-state.js";
import { permissionManager } from "./permissions.js";

const MANIFEST = {
  name: "avo",
  version: "1.0.0",
  description: "Overlay window manager for AI vision. Create, position and share screen regions with AI agents.",
  capabilities: {
    tools: true,
    resources: true,
  },
};

const WS_PORT = 8765;

const mcpServer = new Server(
  MANIFEST,
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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
      },
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
      },
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
    ]
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const agentId = process.env.AVO_AGENT_ID || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ctx = { agentId };

  try {
    switch (name) {
      case "avo_list_windows":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoListWindows(args as any, ctx)) }] };
      case "avo_get_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetWindow(args as any, ctx)) }] };
      case "avo_capture_screenshot":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoCaptureScreenshot(args as any, ctx)) }] };
      case "avo_move_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoMoveWindow(args as any, ctx)) }] };
      case "avo_resize_window":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoResizeWindow(args as any, ctx)) }] };
      case "avo_update_metadata":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoUpdateMetadata(args as any, ctx)) }] };
      case "avo_set_display_mode":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoSetDisplayMode(args as any, ctx)) }] };
      case "avo_stitch_screenshots":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoStitchScreenshots(args as any, ctx)) }] };
      case "avo_get_history":
        return { content: [{ type: "text", text: JSON.stringify(await tools.avoGetHistory(args as any, ctx)) }] };
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

class UnifiedServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();

  startWs() {
    this.wss = new WebSocketServer({ port: WS_PORT });
    this.wss.on("connection", this.handleConnection.bind(this));
    console.log(`AVO WebSocket server started on port ${WS_PORT}`);
  }

  private handleConnection(ws: WebSocket) {
    const clientId = `client_${Date.now()}`;
    this.clients.set(clientId, ws);
    console.log(`Client connected: ${clientId}`);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(clientId, msg);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    });

    ws.on("close", () => {
      console.log(`Client disconnected: ${clientId}`);
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

      case "window_create": {
        const win = windowState.create(msg.id, msg.name, msg.bounds);
        this.broadcast({
          type: "window_created",
          window: win
        });
        break;
      }

      case "window_delete":
        windowState.delete(msg.windowId);
        this.broadcast({
          type: "window_deleted",
          windowId: msg.windowId
        });
        break;

      case "ai_viewing":
        this.broadcastToWindowSubscribers(msg.windowId, {
          type: "ai_viewing",
          windowId: msg.windowId,
          isViewing: msg.isViewing
        });
        break;

      case "request_state": {
        const ws = this.clients.get(clientId);
        if (ws) {
          ws.send(JSON.stringify({
            type: "state",
            windows: windowState.getAll()
          }));
        }
        break;
      }

      case "subscribe": {
        if (msg.windowId && msg.agentId) {
          windowState.addSubscriber(msg.windowId, msg.agentId);
          const ws = this.clients.get(clientId);
          if (ws) {
            ws.send(JSON.stringify({
              type: "subscribed",
              windowId: msg.windowId
            }));
          }
        }
        break;
      }

      case "unsubscribe":
        if (msg.windowId && msg.agentId) {
          windowState.removeSubscriber(msg.windowId, msg.agentId);
        }
        break;
    }
  }

  broadcastToWindowSubscribers(windowId: string, message: any) {
    const win = windowState.get(windowId);
    if (!win) return;

    for (const [clientId, ws] of this.clients) {
      if (win.subscribers.some(s => permissionManager.hasAccess(windowId, s))) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      }
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

const unifiedServer = new UnifiedServer();

const AGENT_ID = process.env.AVO_AGENT_ID || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function main() {
  console.error(`AVO MCP Server starting with agentId: ${AGENT_ID}`);
  unifiedServer.startWs();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main();
