import { WebSocketServer, WebSocket } from "ws";
import { windowState } from "./window-state.js";
import { permissionManager } from "./permissions.js";

const WS_PORT = 8765;

export class AVOServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  
  constructor() {
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
        
      case "window_create":
        const win = windowState.create(msg.id, msg.name, msg.bounds);
        this.broadcast({
          type: "window_created",
          window: win
        });
        break;
        
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
    const window = windowState.get(windowId);
    if (!window) return;
    
    for (const [clientId, ws] of this.clients) {
      if (window.subscribers.some(s => permissionManager.hasAccess(windowId, s))) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
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