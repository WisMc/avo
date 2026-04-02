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
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
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
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(url), 1000 * this.reconnectAttempts);
    }
  }
  
  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WebSocketClient();