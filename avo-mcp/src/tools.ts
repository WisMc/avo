import { permissionManager } from "./permissions.js";
import { OverlayWindow, ScreenshotResult } from "./types.js";
import * as fs from "fs";
import * as path from "path";

let windowState: Map<string, OverlayWindow> = new Map();

export function setWindowState(ws: Map<string, OverlayWindow>) {
  windowState = ws;
}

export interface ToolContext {
  agentId: string;
}

export async function avoListWindows(_args: any, ctx: ToolContext) {
  const accessibleIds = permissionManager.getAccessibleWindows(ctx.agentId);
  const windows: OverlayWindow[] = [];
  
  for (const id of accessibleIds) {
    const win = windowState.get(id);
    if (win) windows.push(win);
  }
  
  return { windows };
}

export async function avoGetWindow(args: { window_id: string }, ctx: ToolContext) {
  const { window_id } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED: You do not have access to this window");
  }
  
  const win = windowState.get(window_id);
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
  
  const win = windowState.get(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `window_${window_id}_${timestamp}.png`;
  const tempDir = "/tmp/avo";
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filepath = path.join(tempDir, filename);
  fs.writeFileSync(filepath, Buffer.from("screenshot-placeholder"));
  
  const result: ScreenshotResult = {
    screenshotPath: filepath,
    lockedInfo: win.lockedInfo,
    timestamp: new Date().toISOString(),
    dimensions: { width: win.bounds.width, height: win.bounds.height }
  };
  
  return result;
}

export async function avoMoveWindow(args: { window_id: string; x: number; y: number }, ctx: ToolContext) {
  const { window_id, x, y } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  const win = windowState.get(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  win.bounds.x = x;
  win.bounds.y = y;
  
  return { success: true, bounds: win.bounds };
}

export async function avoResizeWindow(args: { window_id: string; width: number; height: number }, ctx: ToolContext) {
  const { window_id, width, height } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  const win = windowState.get(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  win.bounds.width = width;
  win.bounds.height = height;
  
  return { success: true, bounds: win.bounds };
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
  
  const win = windowState.get(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  if (locked_info) {
    win.lockedInfo = { ...win.lockedInfo, ...locked_info };
  }
  if (dynamic_info) {
    win.dynamicInfo = { ...win.dynamicInfo, ...dynamic_info };
  }
  if (lock_dynamic !== undefined) {
    win.isLocked = lock_dynamic;
  }
  
  return {
    success: true,
    locked_info: win.lockedInfo,
    dynamic_info: win.dynamicInfo,
    is_locked: win.isLocked
  };
}

export async function avoSetDisplayMode(args: { window_id: string; display_mode: string }, ctx: ToolContext) {
  const { window_id, display_mode } = args;
  
  if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
    throw new Error("ACCESS_DENIED");
  }
  
  const win = windowState.get(window_id);
  if (!win) throw new Error("WINDOW_NOT_FOUND");
  
  if (!["minimal", "info", "full"].includes(display_mode)) {
    throw new Error("INVALID_DISPLAY_MODE: Must be minimal, info, or full");
  }
  
  win.displayMode = display_mode as OverlayWindow["displayMode"];
  
  return { success: true, display_mode: win.displayMode };
}

export async function avoStitchScreenshots(args: { window_ids: string[] }, ctx: ToolContext) {
  const { window_ids } = args;
  
  for (const windowId of window_ids) {
    if (!permissionManager.hasAccess(windowId, ctx.agentId)) {
      throw new Error("ACCESS_DENIED");
    }
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stitchedPath = `/tmp/avo/stitched_${timestamp}.png`;
  
  const firstWin = windowState.get(window_ids[0]);
  if (firstWin) {
    const firstScreenshot = `window_${window_ids[0]}_${timestamp}.png`;
    const srcPath = path.join("/tmp/avo", firstScreenshot);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, stitchedPath);
    }
  }
  
  return { stitched_path: stitchedPath };
}

export async function avoGetHistory(args: { window_id?: string; limit?: number }, ctx: ToolContext) {
  const { window_id, limit = 10 } = args;
  
  if (window_id) {
    if (!permissionManager.hasAccess(window_id, ctx.agentId)) {
      throw new Error("ACCESS_DENIED");
    }
    return { screenshots: [] };
  }
  
  const accessibleIds = permissionManager.getAccessibleWindows(ctx.agentId);
  const history: Record<string, ScreenshotResult[]> = {};
  
  for (const id of accessibleIds) {
    history[id] = [];
  }
  
  return { history };
}
