import { appWindow } from "@tauri-apps/api/window";
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { screenshot } from "@tauri-apps/plugin-screenshot";

export async function captureWindowScreenshot(windowId: string): Promise<Uint8Array> {
  const capture = await screenshot({
    window: windowId
  });
  return capture;
}

export async function captureRegion(x: number, y: number, width: number, height: number): Promise<Uint8Array> {
  const capture = await screenshot({
    x,
    y,
    width,
    height
  });
  return capture;
}

export async function saveScreenshot(data: Uint8Array, filepath: string): Promise<void> {
  await writeFile(filepath, data, { baseDir: BaseDirectory.Home });
}