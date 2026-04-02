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
