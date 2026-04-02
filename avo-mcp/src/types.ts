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