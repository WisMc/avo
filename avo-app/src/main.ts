import { Window } from "@tauri-apps/api/window";
import { windowStore } from "./window-manager.js";
import { createOverlayWindow } from "./overlay.js";

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

async function init() {
  const state = windowStore.create(
    "test1",
    "Terminal",
    { x: 100, y: 100, width: 400, height: 300 },
    0
  );
  await createOverlayWindow(state, document.body);
}

init();
