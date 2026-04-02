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
