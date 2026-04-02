import { Window } from "@tauri-apps/api/window";
import { windowStore } from "./window-manager.js";
import { createOverlayWindow } from "./overlay.js";
import { wsClient } from "./websocket-client.js";

export interface WindowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function createTauriWindow(id: string, config: WindowConfig) {
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

function broadcastCreate(state: ReturnType<typeof windowStore.create>) {
  wsClient.send("window_create", {
    id: state.id,
    name: state.name,
    bounds: state.bounds,
    displayMode: state.displayMode,
    isLocked: state.isLocked,
    subscribers: state.subscribers,
    lockedInfo: state.lockedInfo,
    dynamicInfo: state.dynamicInfo,
  });
}

async function init() {
  wsClient.connect("ws://localhost:8765");
  
  const state = windowStore.create(
    "test1",
    "Terminal",
    { x: 100, y: 100, width: 400, height: 300 },
    0
  );
  await createOverlayWindow(state, document.body);
  broadcastCreate(state);
}

init();
