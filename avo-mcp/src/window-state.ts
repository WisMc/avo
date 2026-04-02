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
  
  delete(id: string): boolean {
    return this.windows.delete(id);
  }
}

export const windowState = new WindowStateManager();